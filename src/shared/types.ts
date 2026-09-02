export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export type CaptureMode = 'ocr' | 'oss' | 'clipboard' | 'file' | 'stick'

export type OverlayMode = CaptureMode | 'select'

export type ScreenRect = {
  x: number
  y: number
  width: number
  height: number
}

export type OverlayResult = ScreenRect & { mode: CaptureMode; imagePath?: string }

export type ComposeReady = {
  imagePath: string
  dataUrl: string
  width: number
  height: number
}

export type ComposeTool = 'arrow' | 'line' | 'rect' | 'ellipse' | 'pen' | 'text' | 'blur' | 'step'

export type OcrLine = {
  text: string
  confidence: number | null
}

export type OcrResult = {
  text: string
  lines: OcrLine[]
  line_count: number
  elapsed_ms: number
  engine_ms: number | null
  model: string
  model_name: string
  provider: string
}

export type OssUploadResult = {
  bucket: string
  object: string
  url: string | null
  etag: string | null
  size: number
}

export type HistoryItem = {
  id: string
  at: number
  kind: CaptureMode
  imagePath: string
  savedPath?: string
  ocr?: OcrResult
  oss?: OssUploadResult
}

export type OssSourcePublic = {
  id: string
  label: string
  region?: string
  endpoint?: string
  bucket: string
  writable: boolean
}

export type OssSourceEdit = {
  id: string
  label: string
  region: string
  endpoint: string
  bucket: string
  accessKeyId: string
  accessKeySecret: string
  timeout: number
  writable: boolean
}

export type OcrModel = {
  id: string
  name: string
  desc: string
  default: boolean
  bundled: boolean
  ready: boolean
}

export type OverlayHotkeys = {
  overlayClipboardHotkey: string
  overlayFileHotkey: string
  overlayOcrHotkey: string
  overlayOssHotkey: string
  overlayStickHotkey: string
}

export type AppSettings = OverlayHotkeys & {
  ossPrefix: string
  ocrModel: string
  ocrHotkey: string
  ossHotkey: string
  clipboardHotkey: string
  fileHotkey: string
  stickHotkey: string
}

export type Bootstrap = {
  settings: AppSettings
  oss: OssSourceEdit
  ossConfigPath: string
  ocrModels: OcrModel[]
  history: HistoryItem[]
  python: string
  autostartEnabled: boolean
}

export type StatusEvent = {
  kind: 'info' | 'success' | 'error'
  message: string
}

export type StickerReady = {
  dataUrl: string
}
