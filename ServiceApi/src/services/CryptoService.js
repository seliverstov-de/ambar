import crypto from 'crypto'

export const getSha256 = (data) => crypto.createHash('sha256').update(data).digest('hex')
export const getSha1 = (data) => crypto.createHash('sha1').update(data).digest('hex')
