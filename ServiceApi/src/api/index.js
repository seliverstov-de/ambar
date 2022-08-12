import { Router } from 'express'
import fs from 'fs'
import files from './files.js'
import logs from './logs.js'
import thumbs from './thumbs.js'
import tags from './tags.js'

export default ({ config, storage }) => {
	let api = Router()

	api.use('/files', files({ config, storage }))	
	api.use('/logs', logs({ config, storage }))
	api.use('/thumbs', thumbs({ config, storage }))
	api.use('/tags', tags({ config, storage }))

	api.get('/', (req, res) => {
		// Use JSON imports once they're stable within Node
		const meta = JSON.parse(fs.readFileSync('../../package.json', 'utf8'))
		res.json({
			version: meta.version
		})
	})

	return api
}
