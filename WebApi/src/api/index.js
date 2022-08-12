import { Router } from 'express'
import fs from 'fs'
import files from './files.js'
import logs from './logs.js'
import search from './search.js'
import stats from './stats.js'
import thumbs from './thumbs.js'
import tags from './tags.js'

export default ({ config, storage }) => {
	let api = Router()

	api.use('/files', files({ config, storage }))
	api.use('/logs', logs({ config, storage }))
	api.use('/search', search({ config, storage }))
	api.use('/stats', stats({ config, storage }))
	api.use('/thumbs', thumbs({ config, storage }))
	api.use('/tags', tags({ config, storage }))

	api.get('/', (req, res) => {
		// Use JSON imports once they're stable within Node
		const meta = JSON.parse(fs.readFileSync('../../package.json', 'utf8'))
		res.json({
			version: meta.version,							
			uiLang: config.uiLang,
			rawConfig: config
		})
	})

	return api
}
