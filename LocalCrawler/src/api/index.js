import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import config from '../config.js'

import * as ApiProxy from '../services/ApiProxy.js'

export default () => {
	let api = Router()

	api.get('/', async (req, res) => {
		// Use JSON imports once they're stable within Node
		const meta = JSON.parse(fs.readFileSync('../../package.json', 'utf8'))
		res.json({
			name: meta.name,
			version: meta.version,
			description: meta.description
		})
	})

	api.get('/download', (req, res) => {
		const filePath = req.query.path

		if (!filePath) {
			res.sendStatus(400)
			return
		}

		let absolutePath = null
		let doesFileExist = false

		try {
			absolutePath = path.join(config.crawlPath, filePath)
			doesFileExist = fs.existsSync(absolutePath)
		} catch (error) {
			ApiProxy.logData(config.name, 'error', `Error: ${error}`)
			res.status(500).json({ error: error })
			return
		}

		if (!doesFileExist) {
			res.sendStatus(404)
			return
		}

		res.download(absolutePath, (error) => {
			if (error) {
				if (!res.headersSent) {
					res.status(500).json({ error: error })
				}
				ApiProxy.logData(config.name, 'error', `[${absolutePath}] Error: ${error}`)
			}
		})
	})

	return api
}
