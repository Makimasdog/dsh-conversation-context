import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { protocol } from './protocol.js'

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')
const output = new URL('./dist/', import.meta.url)
await mkdir(output, { recursive: true })
await writeFile(new URL('client.js', output),
  source.replace('/* protocol factory */', () => protocol.toString()))
