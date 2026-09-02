import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApiResult,
  AppSettings,
  Bootstrap,
  CaptureMode,
  ComposeReady,
  HistoryItem,
  OssSourceEdit,
  OverlayResult,
  ScreenRect,
  StatusEvent,
  StickerReady
} from '../shared/types'

const api = {
  bootstrap: (): Promise<ApiResult<Bootstrap>> => ipcRenderer.invoke('bootstrap'),
  captureOcr: (): Promise<ApiResult<HistoryItem>> => ipcRenderer.invoke('capture:ocr'),
  captureOss: (): Promise<ApiResult<HistoryItem>> => ipcRenderer.invoke('capture:oss'),
  captureClipboard: (): Promise<ApiResult<HistoryItem>> => ipcRenderer.invoke('capture:clipboard'),
  captureFile: (): Promise<ApiResult<HistoryItem>> => ipcRenderer.invoke('capture:file'),
  saveSettings: (settings: AppSettings): Promise<ApiResult<AppSettings>> =>
    ipcRenderer.invoke('settings:save', settings),
  setAutostart: (enabled: boolean): Promise<ApiResult<boolean>> =>
    ipcRenderer.invoke('autostart:set', enabled),
  getOssSource: (): Promise<ApiResult<OssSourceEdit>> => ipcRenderer.invoke('oss:get'),
  saveOssSource: (source: OssSourceEdit): Promise<ApiResult<OssSourceEdit>> =>
    ipcRenderer.invoke('oss:save', source),
  clearHistory: (): Promise<ApiResult<HistoryItem[]>> => ipcRenderer.invoke('history:clear'),
  copy: (text: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('copy', text),
  copyImage: (filePath: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('copy:image', filePath),
  openUrl: (url: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('open:url', url),
  openPath: (filePath: string) => ipcRenderer.invoke('open:path', filePath) as Promise<ApiResult<boolean>>,
  overlayFinish: (result: OverlayResult) => ipcRenderer.send('overlay:finish', result),
  overlayCancel: () => ipcRenderer.send('overlay:cancel'),
  overlayRegion: (rect: ScreenRect) => ipcRenderer.send('overlay:region', rect),
  saveCompose: (dataUrl: string): Promise<ApiResult<string>> =>
    ipcRenderer.invoke('overlay:save-compose', dataUrl),
  onComposeReady: (cb: (payload: ComposeReady) => void) => {
    const listener = (_event: unknown, payload: ComposeReady) => cb(payload)
    ipcRenderer.on('compose:ready', listener)
    return () => ipcRenderer.removeListener('compose:ready', listener)
  },
  onOverlayHotkey: (cb: (mode: CaptureMode) => void) => {
    const listener = (_event: unknown, mode: CaptureMode) => cb(mode)
    ipcRenderer.on('overlay:hotkey', listener)
    return () => ipcRenderer.removeListener('overlay:hotkey', listener)
  },
  onStickerReady: (cb: (payload: StickerReady) => void) => {
    const listener = (_event: unknown, payload: StickerReady) => cb(payload)
    ipcRenderer.on('sticker:ready', listener)
    return () => ipcRenderer.removeListener('sticker:ready', listener)
  },
  onStickerRestore: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('sticker:restore', listener)
    return () => ipcRenderer.removeListener('sticker:restore', listener)
  },
  stickerDragStart: (screenX: number, screenY: number) =>
    ipcRenderer.send('sticker:drag-start', screenX, screenY),
  stickerDragEnd: () => ipcRenderer.send('sticker:drag-end'),
  stickerScale: (screenX: number, screenY: number, direction: 1 | -1) =>
    ipcRenderer.send('sticker:scale', screenX, screenY, direction),
  stickerMenu: () => ipcRenderer.send('sticker:menu'),
  stickerClose: () => ipcRenderer.send('sticker:close'),
  onStatus: (cb: (event: StatusEvent) => void) => {
    const listener = (_event: unknown, payload: StatusEvent) => cb(payload)
    ipcRenderer.on('status', listener)
    return () => ipcRenderer.removeListener('status', listener)
  },
  onHistory: (cb: (items: HistoryItem[]) => void) => {
    const listener = (_event: unknown, payload: HistoryItem[]) => cb(payload)
    ipcRenderer.on('history', listener)
    return () => ipcRenderer.removeListener('history', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type AreaCaptureApi = typeof api
