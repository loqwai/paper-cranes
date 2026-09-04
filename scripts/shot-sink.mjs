import http from 'http'
import { writeFileSync } from 'fs'
const DIR = 'D:/Projects/pc-lab-ume/journals/lab/shots/'
http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    if (req.method === 'OPTIONS') return res.end()
    let b = ''
    req.on('data', c => b += c)
    req.on('end', () => {
        try {
            const { name, data } = JSON.parse(b)
            const buf = Buffer.from(data.split(',')[1], 'base64')
            writeFileSync(DIR + name, buf)
            res.end(JSON.stringify({ ok: true, bytes: buf.length }))
        } catch (e) { res.statusCode = 500; res.end(String(e)) }
    })
}).listen(6990, () => console.log('sink on 6990'))
