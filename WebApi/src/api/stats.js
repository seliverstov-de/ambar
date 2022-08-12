import { Router } from 'express'
import { fromUnixTime, isSameDay, lightFormat, startOfDay, subDays } from 'date-fns'
import * as QueryParser from '../utils/QueryParser.js'
import * as EsProxy from '../services/EsProxy/EsProxy.js'

const MIN_THRESHOLD_CONTENT_TYPE = 0.05
const DAYS_SPAN = 30

export default ({ storage }) => {
    let api = Router()

     const buildProcRateStats = (esResponse) => {
        const procRate = {
            data: [],
            names: []
        }

        const names = new Set()
        const dates = []

        esResponse.proc_rate.buckets.forEach((dateBucket) => {
            dateBucket.source.buckets.forEach((nameBucket) => {
                names.add(nameBucket.key)
            })
        })

        procRate.names = Array.from(names)

        const startOfToday = startOfDay(new Date())
        for (let dateSpan = DAYS_SPAN - 1; dateSpan >= 0; dateSpan--) {
            dates.push(subDays(startOfToday, dateSpan))
        }

        dates.forEach((date) => {
            const dateItem = {
                date: lightFormat(date, 'yyyy-MM-dd')
            }
            names.forEach((name) => {
                dateItem[name] = 0
                const esDateBucket = esResponse.proc_rate.buckets.find((bucket) => isSameDay(fromUnixTime(bucket.key / 1000), date))
                if (esDateBucket) {
                    const esNameBucket = esDateBucket.source.buckets.find((bucket) => (bucket.key == name))
                    if (esNameBucket) {
                        dateItem[name] = esNameBucket.doc_count
                    }
                }
            })
            procRate.data.push(dateItem)
        })

        return procRate
    }

    const buildContentTypeStats = (esResponse) => {
        const contentTypeTotal = esResponse.content_type.buckets.reduce((sum, bucket) => {
            return sum + bucket.doc_count
        }, 0)

        const contentType = {
            total: contentTypeTotal,
            minThreshold: MIN_THRESHOLD_CONTENT_TYPE * contentTypeTotal,
            data: esResponse.content_type.buckets.map((bucket) => ({ name: bucket.key, value: bucket.doc_count, sizeDataInBytes: bucket.size }))
        }

        return contentType
    }

    const buildProcTotalStats = (esResponse) => {
        const procTotalStats = {
            totalCount: esResponse.proc_total.count,
            sizeDataInBytes: {
                sum: esResponse.proc_total.sum,
                avg: esResponse.proc_total.avg,
                min: esResponse.proc_total.min,
                max: esResponse.proc_total.max
            }
        }

        return procTotalStats
    }

    const esStatsToView = (esResponse) => {
        const res = {
            contentType: buildContentTypeStats(esResponse),
            procRate: buildProcRateStats(esResponse),
            procTotal: buildProcTotalStats(esResponse)
        }

        return (res)
    }

    /**     
     * Get Statistics     
     */
    api.get('/', (req, res, next) => {
        EsProxy.getStats(storage.elasticSearch)
            .then(response => res.status(200).json(esStatsToView(response.aggregations)))
            .catch(next)
    })

    /**     
     * Get Combined Statistics     
     */
    api.get('/combined', (req, res, next) => {
        let parsedQuery = QueryParser.parseEsStringQuery('*')

        EsProxy.getFilesStatsByQuery(storage.elasticSearch, parsedQuery, 10000)
            .then((results) => res.status(200).json(results))
            .catch(next)
    })

    /**     
     * Get Combined Statistics     
     */
    api.get('/processing', (req, res, next) => {
        let parsedQuery = QueryParser.parseEsStringQuery('*')

        EsProxy.getProcessingStats(storage.elasticSearch, parsedQuery, 10000)
            .then((results) => res.status(200).json(results))
            .catch(next)
    })

    return api
}
