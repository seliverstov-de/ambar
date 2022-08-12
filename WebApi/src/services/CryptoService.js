import crypto from 'crypto'

const DOWNLOAD_URI_CIPHER_KEY = Buffer.from('635266556A586E327235753778214125442A472D4B6150645367566B59703373', 'hex')

export const getSha256 = (data) => crypto.createHash('sha256').update(data).digest('hex')
export const getSha1 = (data) => crypto.createHash('sha1').update(data).digest('hex')

export const encryptDownloadUri = (fileId) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes256', DOWNLOAD_URI_CIPHER_KEY, iv)
    let encrypted = cipher.update(JSON.stringify({ fileId: fileId }))
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export const decryptDownloadUri = (uri) => {
    const [iv, payload] = uri.split(':')
    const decipher = crypto.createDecipheriv('aes256', DOWNLOAD_URI_CIPHER_KEY, Buffer.from(iv, 'hex'))
    let decrypted = decipher.update(payload)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return JSON.parse(decrypted.toString('utf-8'))
}
