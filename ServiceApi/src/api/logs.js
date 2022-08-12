import { Router } from 'express'
import ErrorResponse from '../utils/ErrorResponse.js'
import * as EsProxy from '../services/EsProxy/EsProxy.js'

export default ({ storage }) => {
    let api = Router()

    /**
     * Submit log record
     */
    api.post('/', (req, res) => {
        const { body: logItem } = req

        if (!logItem) {
            res.status(400).json(new ErrorResponse('Bad request'))
            return
        }

        res.sendStatus(200) //Immediately send response
        EsProxy.indexLogItem(storage.elasticSearch, logItem)
    })

    return api
}
