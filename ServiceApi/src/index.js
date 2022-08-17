import http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import api from './api/index.js'
import config from './config.js'
import { ErrorHandlerService, EsProxy, MongoProxy, StorageService } from './services/index.js'

const createLogRecord = (type, message) => ({
	type: type,
	source_id: 'serviceapi',
	message: message
})

let app = express()

app.server = http.createServer(app)

app.use(bodyParser.json({
	limit: config.bodyLimit
}))

app.use(morgan('dev'))

// connect to storage
StorageService.initializeStorage()
	.then((storage) =>
		MongoProxy.initDefaultTaggingRules(storage.mongoDb)			
			.then(async () => {
				app.use('/api', api({ config, storage }))
				app.use(ErrorHandlerService(storage.elasticSearch))
				app.server.listen(process.env.PORT || config.localPort)

				console.log(`Started on ${app.server.address().address}:${app.server.address().port}`)

				await EsProxy.createIndices(storage.elasticSearch)

				await EsProxy.indexLogItem(
					storage.elasticSearch,
					createLogRecord('info', `Started on ${app.server.address().address}:${app.server.address().port}`)
				)
			})
	)
	.catch((err) => {
		console.log('Catastrophic failure!', err.toString())
		process.exit(1)
	})

export default app