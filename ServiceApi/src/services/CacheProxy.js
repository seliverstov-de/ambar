import { EsProxy,  DateTimeService } from './index.js'

const TAGS_HASH_NAME = 'tags'

export const checkIfMetaIdExists = (redis, metaId) => redis.GET(`meta:${metaId}`)
export const addMetaId = (redis, metaId) => { redis.SET(`meta:${metaId}`, DateTimeService.getCurrentDateTime()) }

export const addTag = async (redis, elasticSearch, fileId, tag) => {
    await EsProxy.indexTag(elasticSearch, fileId, tag)
    if (await hasTagsInRedis(redis)) {
        const filesCount = await getTagFilesCount(redis, tag.name, tag.type)
        await setTagFilesCount(redis, tag.name, tag.type, filesCount + 1)
    }
}

const hasTagsInRedis = async (redis) => await redis.EXISTS(TAGS_HASH_NAME) === 1

const getTagFilesCount = async (redis, tagName, tagType) => {
    const filesCount = await redis.HGET(TAGS_HASH_NAME, `${tagType} ${tagName}`)
    return !filesCount ? 0 : parseInt(filesCount)
}

const setTagFilesCount = async (redis, tagName, tagType, filesCount) => {
    if (filesCount == 0) {
        await redis.HDEL(TAGS_HASH_NAME, `${tagType} ${tagName}`)
    } else {
        await redis.HSET(TAGS_HASH_NAME, `${tagType} ${tagName}`, filesCount)
    }
}
