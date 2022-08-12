import { GridFSBucket } from 'mongodb'
import { createReadStream } from 'streamifier'

export const uploadFile = (mongo, fileName, buffer) => new Promise((resolve, reject) => {
    const gfs = new GridFSBucket(mongo)

    const writeStream = gfs.openUploadStream(fileName)

    writeStream.on('close', (result) => resolve(result))
    writeStream.on('error', (error) => reject(error))

    createReadStream(buffer).pipe(writeStream)
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
