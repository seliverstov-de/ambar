import { GridFSBucket } from 'mongodb'

export const uploadFile = (mongo, fileName, buffer) => new Promise((resolve, reject) => {
    const gfs = new GridFSBucket(mongo)

    const writeStream = gfs.openUploadStream(fileName)

    writeStream.on('finish', (result) => resolve(result))
    writeStream.on('error', (error) => reject(error))

    writeStream.write(buffer, 'binary')
    writeStream.end()
})

export const checkIfFileExists = async (mongo, fileName) => {
    const gfs = new GridFSBucket(mongo)
    const cursor = gfs.find({ filename: fileName })
    return await cursor.hasNext()
}

export const downloadFile = (mongo, fileName) => {
    const gfs = new GridFSBucket(mongo)
    return gfs.openDownloadStreamByName(fileName)
}
