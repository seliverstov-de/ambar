import { MongoClient } from 'mongodb'
import { Client } from '@elastic/elasticsearch'
import { createClient } from 'redis'
import { QueueProxy } from './index.js'
import config from '../config.js'

export const initializeStorage = async () => {
	const esClient = new Client({
		node: config.elasticSearchUrl
	})

	const redisClient = createClient({ url: `redis://${config.redisHost}:${config.redisPort}` })

	await redisClient.connect()
	await redisClient.ping()

	const mongoConnection = await new Promise((resolve, reject) => {
		MongoClient.connect(config.mongoDbUrl, (err, connection) => {
			if (err) {
				reject(err)
			}
			resolve(connection.db('ambar_data'))
		})
	})

	const rabbitConnection = await QueueProxy.initRabbit

	return {
		elasticSearch: esClient,
		mongoDb: mongoConnection,
		redis: redisClient,
		rabbit: rabbitConnection
	}
}
