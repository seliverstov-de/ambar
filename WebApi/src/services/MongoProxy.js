const BUCKET_DATA = 'bucket_data'
const THUMBNAIL_DATA = 'thumbnail_data'

// BUCKETS
export const getBucketById = (db, bucketId) => new Promise((resolve, reject) => {
    db.collection(BUCKET_DATA)
        .findOne(
        { id: bucketId },
        (err, result) => {
            if (err) {
                reject(err)
                return
            }

            resolve(result)
        })
})

export const createBucket = (db, bucket) => new Promise((resolve, reject) => {
    db.collection(BUCKET_DATA)
        .insertOne(bucket, (err, result) => {
            if (err) {
                reject(err)
                return
            }

            resolve(result)
        })
})
//////////////////////////////////////////////////////////////////////////////////////

// THUMBNAILS
export const getThumbnailById = (db, thumbId) => new Promise((resolve, reject) => {
    db.collection(THUMBNAIL_DATA)
        .findOne(
        { id: thumbId },
        (err, result) => {
            if (err) {
                reject(err)
                return
            }

            resolve(result)
        })
})
