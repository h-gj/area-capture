import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import OSS from 'ali-oss'
import type { OssSourceEdit, OssUploadResult } from '../shared/types'
import { ossConfigPath } from './paths'

type OssSource = {
  label?: string
  region?: string
  endpoint?: string
  bucket: string
  accessKeyId: string
  accessKeySecret: string
  timeout?: number
  secure?: boolean
  cname?: boolean
  internal?: boolean
  writable?: boolean
}

let client: OSS | null = null
let clientKey = ''

const EMPTY: OssSourceEdit = {
  id: 'default',
  label: '',
  region: 'oss-cn-shenzhen',
  endpoint: 'oss-cn-shenzhen.aliyuncs.com',
  bucket: '',
  accessKeyId: '',
  accessKeySecret: '',
  timeout: 60000,
  writable: true
}

function normalizeEndpoint(endpoint?: string): string | undefined {
  if (!endpoint) return undefined
  return String(endpoint).replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function regionFromEndpoint(endpoint: string | undefined, region?: string): string | undefined {
  if (region) return region
  const host = normalizeEndpoint(endpoint) || ''
  const match = host.match(/^(oss-[a-z0-9-]+)\./i)
  return match ? match[1] : undefined
}

function toEdit(src: OssSource): OssSourceEdit {
  return {
    id: 'default',
    label: src.label || src.bucket || '',
    region: src.region || '',
    endpoint: src.endpoint || '',
    bucket: src.bucket || '',
    accessKeyId: src.accessKeyId || '',
    accessKeySecret: src.accessKeySecret || '',
    timeout: src.timeout ?? 60000,
    writable: src.writable !== false
  }
}

function toSource(edit: OssSourceEdit): OssSource {
  const bucket = String(edit.bucket || '').trim()
  const accessKeyId = String(edit.accessKeyId || '').trim()
  const accessKeySecret = String(edit.accessKeySecret || '').trim()
  if (!bucket) throw new Error('OSS bucket is required')
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('OSS accessKeyId and accessKeySecret are required')
  }
  return {
    label: String(edit.label || '').trim() || bucket,
    region: String(edit.region || '').trim() || undefined,
    endpoint: String(edit.endpoint || '').trim() || undefined,
    bucket,
    accessKeyId,
    accessKeySecret,
    timeout: Number(edit.timeout) > 0 ? Number(edit.timeout) : 60000,
    writable: edit.writable !== false
  }
}

function seedFromHutoolbox(): OssSource | null {
  try {
    const data = JSON.parse(
      readFileSync(join(homedir(), '.config/hutoolbox/oss/sources.json'), 'utf8') || '{}'
    ) as { default?: string; sources?: Record<string, OssSource> }
    const sources = data.sources || {}
    const writable = Object.values(sources).find((src) => src.writable !== false)
    if (writable) return writable
    if (data.default && sources[data.default]) return sources[data.default]
    return Object.values(sources)[0] || null
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export function loadOssSource(): OssSource | null {
  try {
    const data = JSON.parse(readFileSync(ossConfigPath(), 'utf8') || '{}') as Partial<OssSource>
    if (!data.bucket && !data.accessKeyId) return null
    return data as OssSource
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    const seeded = seedFromHutoolbox()
    if (!seeded) return null
    const file = ossConfigPath()
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
    writeFileSync(file, JSON.stringify(seeded, null, 2) + '\n', { mode: 0o600 })
    return seeded
  }
}

export function getOssSource(): OssSourceEdit {
  const src = loadOssSource()
  return src ? toEdit(src) : { ...EMPTY }
}

export function saveOssSource(edit: OssSourceEdit): OssSourceEdit {
  const src = toSource(edit)
  const file = ossConfigPath()
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, JSON.stringify(src, null, 2) + '\n', { mode: 0o600 })
  client = null
  clientKey = ''
  return toEdit(src)
}

function getClient(src: OssSource): OSS {
  const key = [
    src.accessKeyId,
    src.bucket,
    src.endpoint || '',
    src.region || '',
    String(src.timeout ?? 60000)
  ].join('|')
  if (client && clientKey === key) return client
  if (!src.accessKeyId || !src.accessKeySecret) {
    throw new Error('OSS is missing accessKeyId / accessKeySecret')
  }
  if (!src.bucket) throw new Error('OSS is missing bucket')

  const endpoint = normalizeEndpoint(src.endpoint)
  const region = regionFromEndpoint(endpoint, src.region)
  const opts: Record<string, unknown> = {
    accessKeyId: src.accessKeyId,
    accessKeySecret: src.accessKeySecret,
    bucket: src.bucket,
    timeout: src.timeout ?? 60000,
    secure: src.secure !== false
  }
  if (region) opts.region = region
  if (endpoint) opts.endpoint = endpoint
  if (src.cname) opts.cname = true
  if (src.internal) opts.internal = true

  client = new OSS(opts)
  clientKey = key
  return client
}

function publicUrl(src: OssSource, objectName: string, putUrl?: string | null): string {
  if (putUrl) return putUrl
  const endpoint = normalizeEndpoint(src.endpoint)
  if (endpoint) return `https://${src.bucket}.${endpoint}/${objectName}`
  return `https://${src.bucket}.oss.aliyuncs.com/${objectName}`
}

export async function putLocalFile(localPath: string, objectName: string): Promise<OssUploadResult> {
  const src = loadOssSource()
  if (!src) {
    throw new Error(`OSS is not configured. Set it in Config (saved to ${ossConfigPath()}).`)
  }
  if (src.writable === false) {
    throw new Error('OSS config is read-only (writable=false).')
  }
  const oss = getClient(src)
  const res = await oss.put(objectName, localPath, {
    headers: { 'Content-Type': 'image/png' }
  })
  return {
    bucket: src.bucket,
    object: res.name || objectName,
    url: publicUrl(src, res.name || objectName, res.url),
    etag: (res.res?.headers?.etag as string) || null,
    size: 0
  }
}

export function objectKey(prefix: string, capturedAt = new Date()): string {
  const y = capturedAt.getFullYear()
  const m = String(capturedAt.getMonth() + 1).padStart(2, '0')
  const d = String(capturedAt.getDate()).padStart(2, '0')
  const hh = String(capturedAt.getHours()).padStart(2, '0')
  const mm = String(capturedAt.getMinutes()).padStart(2, '0')
  const ss = String(capturedAt.getSeconds()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 8)
  const base = (prefix || 'attachment/area-capture').replace(/^\/+|\/+$/g, '')
  return `${base}/${y}${m}${d}-${hh}${mm}${ss}-${rand}.png`
}
