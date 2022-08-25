import parseArgs from 'minimist'

const defaultConfig = {
	"localPort": 8080,
	"bodyLimit": "1024mb",
	"mongoDbUrl": "mongodb://ambar:27017/",
	"elasticSearchUrl": "http://ambar:9200",
	"redisHost": "ambar",
	"redisPort": "6379",
	"rabbitHost": "amqp://ambar",
	"uiLang": "en",
	"crawlerPort": 8082
}

const intParamsList = ['localPort']

let config = null

const init = () => {
	const options = parseArgs(process.argv.slice(2))

	const receivedConfig = options.config && options.config != '' ? JSON.parse(Buffer.from(options.config, 'base64').toString('utf8')) : {}

	Object.keys(receivedConfig).forEach(key => {
		if (intParamsList.includes(key)) {
			receivedConfig[key] = parseInt(receivedConfig[key])
		}
	})

	const env = process.env

	return {
		...defaultConfig,
		...receivedConfig,
		...env		
	}
}

export default (() => {
	return config === null
		? init()
		: config
})()


