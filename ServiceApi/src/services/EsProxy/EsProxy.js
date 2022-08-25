import * as DateTimeService from '../DateTimeService.js'
import { FileIndexMapping, LogIndexMapping } from './IndexMappings.js'

const ES_LOG_INDEX = 'ambar_log_record'
const ES_FILE_INDEX = 'ambar_file'

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

const transformHit = (hit) => {
    const transformedHit = {
        ...hit._source,
        score: hit._score
    }

    const highlight = mergeAnalyzedFieldsHighlight(hit.highlight)

    if (highlight) {
        Object.entries(highlight).forEach((key, value) => {
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

    return transformedHit
}

export const createIndices = async (esClient) => {
    if (!(await esClient.indices.exists({ index: ES_LOG_INDEX }))) {
        await esClient.indices.create({
            index: ES_LOG_INDEX,
            ...LogIndexMapping
        })
    }

    if (!(await esClient.indices.exists({ index: ES_FILE_INDEX }))) {
        await esClient.indices.create({
            index: ES_FILE_INDEX,
            ...FileIndexMapping
        })
    }
}

export const checkIfMetaIdExists = async (esClient, metaId) => {
    try {
        const body = await esClient.search({
            index: ES_FILE_INDEX,
            _source: false,
            query: {
                term: { 'meta.id': metaId }
            }
        })
        return body.hits.total.value > 0
    } catch (error) {
        if (error.statusCode !== 404) {
            console.error(error)
        }
        return false
    }
}

export const getFileBySha = async (esClient, sha) => {
    const body = await esClient.search({
        index: ES_FILE_INDEX,
        from: 0,
        size: 1,
        query: {
            term: { 'sha256': sha }
        }
    })
    return body.hits.total.value > 0 ? normalizeHitContentHighlights(transformHit(body.hits.hits[0])) : null
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

export const indexLogItem = async (esClient, logItem) => {
    await esClient.index({
        index: ES_LOG_INDEX,
        document: {
            ...logItem,
            indexed_datetime: DateTimeService.getCurrentDateTime()
        }
    })
}

export const deleteAutoTags = async (esClient, fileId) => {
    return await esClient.updateByQuery({
        index: ES_FILE_INDEX,
        refresh: true,
        query: {
            term: { file_id: fileId }
        },
        script: {
            lang: 'painless',
            source: 'ctx._source.tags.removeIf(tag -> tag.type == \'auto\' || tag.type == \'source\')'
        }
    })
}

export const updateFile = async (esClient, fileId, data) => {
    const fileData = JSON.parse(data.toString())

    const body = await esClient.search({
        index: ES_FILE_INDEX,
        _source: false,
        query: {
            term: { file_id: fileId }
        }
    })

    const existingId = body.hits.hits[0]

    let response
    if (existingId) {
        response = await esClient.update({
            index: ES_FILE_INDEX,
            id: existingId,
            refresh: true,
            doc: fileData,
            doc_as_upsert: true
        })
    } else {
        response = await esClient.index({
            index: ES_FILE_INDEX,
            refresh: true,
            document: fileData
        })
    }

    return response.result
}
