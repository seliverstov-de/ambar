import { lightFormat, startOfDay, isSameDay, fromUnixTime, subDays, subMonths, isSameMonth } from 'date-fns'
import { DateTimeService } from '../index.js'
import * as EsQueryBuilder from '../../utils/EsQueryBuilder.js'

const MIN_THRESHOLD_EXTENSION = 0.03

const ES_LOG_INDEX = 'ambar_log_record'
const ES_FILE_INDEX = 'ambar_file'

const normalizeHitsScore = (hits, maxScore) => hits.map(hit => ({
    ...hit,
    _score: hit._score / maxScore
}))

const transformTagsStat = (esResponse) => {
    const resp = []

    esResponse.aggregations.tags.tags.buckets.forEach(tag => {
        tag.type.buckets.forEach(tagType => {
            resp.push({ name: tag.key, type: tagType.key, filesCount: tagType.doc_count })
        })
    })

    return resp
}

const mergeAnalyzedFieldsHighlight = (highlight) => {
    if (!highlight) {
        return highlight
    }

    Object.keys(highlight).filter(key => /\.analyzed$/.test(key)).forEach(key => {
        const originalKey = key.replace(/\.analyzed$/, '')
        if (!highlight[originalKey]) {
            highlight[originalKey] = []
        }
        highlight[originalKey].concat(highlight[key])
        delete highlight[key]
    })

    return highlight
}

const normalizeHitContentHighlights = (hit) => {
    const ALLOWED_TAGS = ['br', 'em', 'em class="entity"']
    const SEPARATOR_TAG = '<br/>'
    const SPACE_CHAR = ' '

    if (!hit.content) {
        return hit
    }

    if (!hit.content.highlight) {
        return hit
    }

    if (!hit.content.highlight.text) {
        return hit
    }

    hit.content.highlight.text = hit.content.highlight.text.map(hl => {
        let strippedHl = hl
            .replace(/</gim, '&lt;')
            .replace(/>/gim, '&gt;')

        ALLOWED_TAGS.forEach(tag => {
            strippedHl = strippedHl
                .replace(new RegExp(`(&lt;${tag}&gt;)`, 'gim'), `<${tag}>`)
                .replace(new RegExp(`(&lt;${tag}/&gt;)`, 'gim'), `<${tag}/>`)
                .replace(new RegExp(`(&lt;/${tag}&gt;)`, 'gim'), `</${tag}>`)
        })

        strippedHl = strippedHl.replace(/(?:\r\n|\r|\n)/gi, SEPARATOR_TAG)
            .replace(/(<br\s*\/?>(\s*)){2,}/gi, SEPARATOR_TAG)
            .replace(/((&nbsp;)+)/gi, SPACE_CHAR)
            .replace(/(?:\t)+/gi, SPACE_CHAR)
            .replace(/[\s]+/gi, SPACE_CHAR)

        return strippedHl
    })

    return hit
}

const transformHit = (hit) => {
    const transformedHit = {
        ...hit._source,
        score: hit._score
    }

    const highlight = mergeAnalyzedFieldsHighlight(hit.highlight)

    if (highlight) {
        Object.entries(highlight).forEach(([key, value]) => {
            if (key.startsWith('meta.')) {
                if (!transformedHit.meta.highlight) {
                    transformedHit.meta.highlight = {}
                }
                transformedHit.meta.highlight[key.replace('meta.', '')] = value
            }
            if (key.startsWith('content.')) {
                if (!transformedHit.content.highlight) {
                    transformedHit.content.highlight = {}
                }
                transformedHit.content.highlight[key.replace('content.', '')] = value
            }
        })
    }

    if (hit.inner_hits && hit.inner_hits.ambar_file_tag) {
        transformedHit.tags = hit.inner_hits.ambar_file_tag.hits.hits.map(hit => {
            return hit.highlight ? { ...hit._source, highlight: hit.highlight } : hit._source
        })
    }

    return transformedHit
}

const getPathType = (fullPath) => /\/$/g.test(fullPath) ? 'folder' : 'file'
const getPathDepth = (fullPath) => getPathType(fullPath) === 'folder' ?
    fullPath.match(/\//g).length - 3 :
    fullPath.match(/\//g).length - 2
const getParentPath = (fullPath) => getPathType(fullPath) === 'file' ?
    fullPath.slice(0, fullPath.lastIndexOf('/') + 1) :
    fullPath.slice(0, fullPath.slice(0, -1).lastIndexOf('/') + 1)
const getPathName = (fullPath) => getPathType(fullPath) === 'file' ?
    fullPath.slice(fullPath.lastIndexOf('/') + 1) :
    fullPath.slice(fullPath.slice(0, fullPath.length - 1).lastIndexOf('/') + 1, -1)
const calculateTreeNodeChildrenCount = (treeNode) => treeNode.children.length > 0 ?
    treeNode.children.reduce((sum, node) => sum + node.hits_count, 0) :
    0

const normalizeTreeAggregationResult = (esResult) => {
    const result = {
        total: esResult.hits.total.value,
        tree: []
    }

    const plainTree = esResult.aggregations.full_name_parts.buckets
        //.filter(bucket => getPathType(bucket.key) != 'file')
        .map(bucket => ({
            path: bucket.key,
            name: getPathName(bucket.key),
            parent_path: getParentPath(bucket.key),
            depth: getPathDepth(bucket.key),
            type: getPathDepth(bucket.key) === 0 ? 'source' : getPathType(bucket.key),
            thumb_available: getPathType(bucket.key) === 'file' ?
                bucket.thumb_available.buckets[0].key === 1 ?
                    true :
                    false :
                null,
            file_id: getPathType(bucket.key) === 'file' ?
                bucket.file_id.buckets[0].key :
                null,
            content_type: getPathType(bucket.key) === 'file' ?
                bucket.content_type.buckets[0].key :
                null,
            sha256: getPathType(bucket.key) === 'file' ?
                bucket.sha256.buckets[0].key :
                null,
            hits_count: bucket.doc_count,
            children: []
        }))

    plainTree
        .filter(node => node.depth > 0)
        .forEach(node =>
            plainTree
                .filter(treeNode => treeNode.depth === node.depth - 1)
                .filter(treeNode => treeNode.path === node.parent_path)
                .forEach(treeNode => treeNode.children.push(node)))

    plainTree
        .filter(treeNode => treeNode.type != 'file')
        .filter(treeNode => treeNode.children.length > 0)
        .filter(treeNode => calculateTreeNodeChildrenCount(treeNode) != treeNode.hits_count)
        .forEach(treeNode => treeNode.children.push({
            path: `${treeNode.path}...`,
            name: '...',
            parent_path: treeNode.path,
            depth: treeNode.depth + 1,
            type: 'mixed',
            thumb_available: null,
            file_id: null,
            content_type: null,
            sha256: null,
            hits_count: treeNode.hits_count - calculateTreeNodeChildrenCount(treeNode),
            children: []
        }))

    return { ...result, tree: plainTree.filter(node => node.depth === 0) }
}

const normalizeStatsAggregationResult = (esResult) => {
    const summary = {
        data: esResult.aggregations.summary
    }

    const total = esResult.hits.total.value

    const extensions = {
        total: total,
        data: esResult.aggregations.extensions.buckets
            .filter(bucket => bucket.doc_count > MIN_THRESHOLD_EXTENSION * total)
            .map(bucket => ({
                extension: bucket.key,
                hits_percent: bucket.doc_count / total * 100,
                hits_count: bucket.doc_count,
                size: bucket.size.sum
            }))
    }
    const presentExtensionsHitsCount = extensions.data.reduce((sum, bucket) => sum + bucket.hits_count, 0)
    if (presentExtensionsHitsCount < total) {
        extensions.data.push({
            extension: 'Others',
            hits_percent: (total - presentExtensionsHitsCount) / total * 100,
            hits_count: total - presentExtensionsHitsCount,
            size: 0
        })
    }

    const tags = {
        total: esResult.aggregations.tags.doc_count,
        data: esResult.aggregations.tags.names.buckets
            .map(bucket => ({
                name: bucket.key,
                type: bucket.types.buckets[0].key,
                hits_percent: bucket.doc_count / esResult.aggregations.tags.doc_count * 100,
                hits_count: bucket.doc_count
            }))
    }

    return {
        total,
        extensions,
        summary,
        tags
    }
}

export const getTagsStat = async (esClient) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getTagsStatsQuery())
    })
    return transformTagsStat(body)
}

export const getFilesTreeByQuery = async (esClient, request) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getFilesTreeQuery(request))
    })
    return normalizeTreeAggregationResult(body)
}

export const getFilesStatsByQuery = async (esClient, request, maxItemsToRetrieve) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getFilesStatsQuery(request, maxItemsToRetrieve))
    })
    return normalizeStatsAggregationResult(body)
}

export const searchFiles = async (esClient, request, from, size) => {
    const requests = [
        { index: ES_FILE_INDEX },
        EsQueryBuilder.getFilesWithHighlightsQuery(request, from * size, size),
        { index: ES_FILE_INDEX },
        EsQueryBuilder.getFilesWithoutHighlightsQuery(request, from * size, size)
    ]

    const body = await esClient.msearch({
        body: requests
    })
    const [withHighlights, withoutHighlights] = body.responses
    const maxScore = Math.max(withHighlights.hits.max_score, withoutHighlights.hits.max_score)

    const resultHits = normalizeHitsScore(withHighlights.hits.hits, maxScore)
        .concat(normalizeHitsScore(withoutHighlights.hits.hits, maxScore))
        .sort((a, b) => b._score - a._score)
        .map((hit) => normalizeHitContentHighlights(transformHit(hit)))
        .filter((hit) => (hit.content.highlight &&
            hit.content.highlight.text &&
            hit.content.highlight.text.length > 0 &&
            !hit.content.highlight.text.some(text => /<em>/.test(text)) &&
            !hit.meta.highlight &&
            !hit.content.highlight.author &&
            request.content != '*' &&
            request.content != '')
            ? false
            : true)

    return {
        total: withHighlights.hits.total.value + withoutHighlights.hits.total.value,
        hits: resultHits
    }
}

export const getFileHighlightByFileId = async (esClient, request, fileId) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getFileHighlightQuery(request, fileId))
    })
    if (body.hits.hits && body.hits.hits.length === 1) {
        return normalizeHitContentHighlights(transformHit(body.hits.hits[0]))
    }
    else {
        return {}
    }
}

export const getFullFileHighlightByFileId = async (esClient, request, fileId) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getFullFileHighlightQuery(request, fileId))
    })
    if (body.hits.hits && body.hits.hits.length === 1) {
        return normalizeHitContentHighlights(transformHit(body.hits.hits[0]))
    }
    else {
        return {}
    }
}

export const checkIfFileExists = async (esClient, fileId) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        _source: false,
        query: {
            term: { file_id: fileId }
        }
    })

    return body.hits.total.value > 0
}

export const getFileByFileId = async (esClient, fileId) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        body: {
            query: { term: { 'file_id': fileId } }
        }
    })
    const file = body.hits.hits[0]
    return file ? normalizeHitContentHighlights(transformHit(file)) : null
}

export const hideFile = async (esClient, fileId) => {
    return await esClient.updateByQuery({
        index: ES_FILE_INDEX,
        refresh: true,
        query: {
            term: { file_id: fileId }
        },
        script: {
            lang: 'painless',
            source: 'ctx._source.hidden = true'
        }
    })
}

export const unHideFile = async (esClient, fileId) => {
    return await esClient.updateByQuery({
        index: ES_FILE_INDEX,
        refresh: true,
        query: {
            term: { file_id: fileId }
        },
        script: {
            lang: 'painless',
            source: 'ctx._source.hidden = false'
        }
    })
}

export const indexTag = async (esClient, fileId, tag) => {
    return await esClient.updateByQuery({
        index: ES_FILE_INDEX,
        refresh: true,
        query: {
            term: { file_id: fileId }
        },
        script: {
            lang: 'painless',
            source: 'ctx._source.tags.add(params.tag)',
            params: { tag }
        }
    })
}

export const deleteTag = async (esClient, fileId, tag) => {
    return await esClient.updateByQuery({
        index: ES_FILE_INDEX,
        refresh: true,
        query: {
            term: { file_id: fileId }
        },
        script: {
            lang: 'painless',
            source: 'ctx._source.tags.removeIf(tag -> tag.name == params.tag.name && tag.type == params.tag.type)',
            params: { tag }
        }
    })
}

export const indexLogItem = async (esClient, logItem) => {
    logItem.indexed_datetime = DateTimeService.getCurrentDateTime()
    await esClient.index({
        index: ES_LOG_INDEX,
        document: logItem
    })
}

export const getLastLogRecords = async (esClient, numberOfRecords) => {
    const body = await esClient.search({
        index: ES_LOG_INDEX,
        from: 0,
        size: numberOfRecords,
        query: { match_all: {} },
        sort: { created_datetime: { order: 'desc' } }
    })
    return body.hits.hits.map(hit => hit._source).reverse()
}

export const getStats = async (esClient) => {
    return await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getStatsQuery())
    })
}

const normalizeProcessingStats = (esResponse) => {
    const ITEMS_COUNT = 10

    const procRate = {
        hours: [],
        days: [],
        months: []
    }

    const dates = []
    const startOfToday = startOfDay(new Date())
    for (let dateSpan = ITEMS_COUNT - 1; dateSpan >= 0; dateSpan--) {
        dates.push(subDays(startOfToday, dateSpan))
    }

    dates.forEach((date) => {
        const dateItem = {
            date: lightFormat(date, 'dd.MM.yyyy'),
            count: 0,
            size: 0
        }

        const esDateBucket = esResponse.aggregations.days.buckets.find((bucket) => isSameDay(fromUnixTime(bucket.key / 1000), date))
        if (esDateBucket) {
            dateItem.count = esDateBucket.doc_count
            dateItem.size = esDateBucket.size.value
        }

        procRate.days.push(dateItem)
    })

    const months = []
    const startOfMonth = startOfMonth(new Date())
    for (let monthsSpan = ITEMS_COUNT - 1; monthsSpan >= 0; monthsSpan--) {
        months.push(subMonths(startOfToday, monthsSpan))
    }
    months.forEach((month) => {
        const monthItem = {
            date: lightFormat(month, 'MM.yyyy'),
            count: 0,
            size: 0
        }

        const esDateBucket = esResponse.aggregations.months.buckets.find((bucket) => isSameMonth(fromUnixTime(bucket.key / 1000), month))
        if (esDateBucket) {
            monthItem.count = esDateBucket.doc_count
            monthItem.size = esDateBucket.size.value
        }

        procRate.months.push(monthItem)
    })

    return procRate
}

export const getProcessingStats = async (esClient) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        ...(EsQueryBuilder.getProcessingStatsQuery())
    })
    return normalizeProcessingStats(body)
}
