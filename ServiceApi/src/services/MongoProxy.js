import config from '../config.js'
import * as CryptoService from './CryptoService.js'

const THUMBNAIL_DATA = 'thumbnail_data'
const AUTO_TAGGING_RULE_DATA = 'auto_tagging_rule_data'

//TAGGING RULES
export const initDefaultTaggingRules = (db) => new Promise((resolve, reject) => {
    const promises = config.defaultTaggingRules.map(taggingRule =>
        new Promise((iResolve, iReject) => {
            const ruleId = CryptoService.getSha1(`taggingRule_${taggingRule.name}`)

            db.collection(AUTO_TAGGING_RULE_DATA)
                .replaceOne({ id: ruleId }, { ...taggingRule, id: ruleId }, { upsert: true }, (err, result) => {
                    if (err) {
                        iReject(err)
                        return
                    }

                    iResolve(result)
                })
        }))

    Promise.all(promises)
        .then(() => resolve())
        .catch(err => reject(err))
})

export const getTaggingRules = (db) => new Promise((resolve, reject) => {
    db.collection(AUTO_TAGGING_RULE_DATA)
        .find()
        .toArray(
        (err, result) => {
            if (err) {
                reject(err)
                return
            }

            resolve(result)
        })
})
//////////////////////////////////////////////////////////////////////////////////////

// THUMBNAILS
export const createThumbnail = (db, thumbId, thumbData) => new Promise((resolve, reject) => {
    db.collection(THUMBNAIL_DATA)
        .replaceOne({ id: thumbId }, { id: thumbId, data: thumbData }, { upsert: true }, (err, result) => {
            if (err) {
                reject(err)
                return
            }

            resolve(result)
        })
})
