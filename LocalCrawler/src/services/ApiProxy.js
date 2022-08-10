import { lightFormat } from 'date-fns'
import axios from 'axios'
import config from '../config.js'

export const logData = async (sourceId, type, message) => {
    console.log(`[${type}] ${message}`)

    try {
        await axios({
            method: 'POST',
            baseURL: config.apiUrl,
            url: `/api/logs`,
            data: {
                source_id: sourceId,
                type: type,
                message: message,
                created_datetime: lightFormat(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')
            }
        })
    } catch (err) {
        console.error(err)
    }
}
