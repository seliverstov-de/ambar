import { Router } from 'express'
import ErrorResponse from '../utils/ErrorResponse.js'
import { MongoProxy, FileUploader } from '../services/index.js'

export default ({ storage }) => {
    let api = Router()

    /**     
    * Add or update thumbnail
    */
    api.post('/:id', FileUploader, (req, res, next) => {
        const { params: { id: thumbId }, files } = req

        if (!files) {
            res.status(400).json(new ErrorResponse('Request body is empty'))
            return
        }

        const fileContent = Buffer.byteLength(files[0].buffer) > 0 ? files[0].buffer : Buffer.alloc(0)

        MongoProxy.createThumbnail(storage.mongoDb, thumbId, fileContent)
            .then(() => {
                res.sendStatus(200)
            })
            .catch(next)
    })

    return api
}