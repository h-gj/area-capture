import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  shell,
  type MenuItemConstructorOptions
} from 'electron'
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  ApiResult,
  AppSettings,
  Bootstrap,
  CaptureMode,
  HistoryItem,
  OssSourceEdit,
  OverlayMode,
  OverlayResult,
  ScreenRect,
  StatusEvent
} from '../shared/types'
import { grabRegion, listOcrModels, recognizeImage } from './ocr'
import { completeOverlay, hideOverlay, isOverlayOpen, openOverlay, revealOverlay, sendToOverlay } from './overlay'
import { getOssSource, objectKey, putLocalFile, saveOssSource } from './oss'
import { capturesDir, iconPath, ossConfigPath, pythonBin } from './paths'
import { loadHistory, loadSettings, pushHistory, saveHistory, saveSettings } from './settings'
import { isAutostartEnabled, setAutostartEnabled } from './autostart'

let tray: Tray | null = null
let historyWindow: BrowserWindow | null = null
let configWindow: BrowserWindow | null = null
let busy = false
let quitting = false
let composePath: string | null = null
let settings = loadSettings()

function wrap<T>(fn: () => Promise<T> | T): Promise<ApiResult<T>> {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : String(err)
    }))
}

function emitStatus(event: StatusEvent): void {
  historyWindow?.webContents.send('status', event)
  configWindow?.webContents.send('status', event)
}

function emitHistory(items: HistoryItem[]): void {
  historyWindow?.webContents.send('history', items)
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body: body.slice(0, 180), icon: iconPath() }).show()
}

function rendererUrl(file = 'index.html', search = ''): string | null {
  if (!process.env.ELECTRON_RENDERER_URL) return null
  return `${process.env.ELECTRON_RENDERER_URL}/${file}${search}`
}

function loadRenderer(win: BrowserWindow, search = ''): void {
  const devUrl = rendererUrl('index.html', search)
  if (devUrl) win.loadURL(devUrl)
  else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      search: search.replace(/^\?/, '')
    })
  }
}

function createHistoryWindow(): BrowserWindow {
  if (historyWindow && !historyWindow.isDestroyed()) return historyWindow

  historyWindow = new BrowserWindow({
    width: 720,
    height: 820,
    minWidth: 560,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'History',
    backgroundColor: '#fafafa',
    icon: iconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  historyWindow.on('ready-to-show', () => historyWindow?.show())
  historyWindow.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    historyWindow?.hide()
  })
  historyWindow.on('closed', () => {
    historyWindow = null
  })
  historyWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  loadRenderer(historyWindow, '?page=history')
  return historyWindow
}

function createConfigWindow(): BrowserWindow {
  if (configWindow && !configWindow.isDestroyed()) return configWindow

  configWindow = new BrowserWindow({
    width: 640,
    height: 860,
    minWidth: 520,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'Config',
    backgroundColor: '#fafafa',
    icon: iconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  configWindow.on('ready-to-show', () => configWindow?.show())
  configWindow.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    configWindow?.hide()
  })
  configWindow.on('closed', () => {
    configWindow = null
  })

  loadRenderer(configWindow, '?page=config')
  return configWindow
}

export function showHistoryWindow(): void {
  const win = createHistoryWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function showConfigWindow(): void {
  const win = createConfigWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function bootstrap(): Promise<Bootstrap> {
  settings = loadSettings()
  let ocrModels = []
  try {
    ocrModels = await listOcrModels()
  } catch {
    ocrModels = []
  }
  return {
    settings,
    oss: getOssSource(),
    ossConfigPath: ossConfigPath(),
    ocrModels,
    history: loadHistory(),
    python: pythonBin(),
    autostartEnabled: isAutostartEnabled()
  }
}

const OVERLAY_HINT: Record<OverlayMode, string> = {
  ocr: 'Drag to select text for OCR',
  oss: 'Drag to select an area to upload',
  clipboard: 'Drag to copy the image',
  file: 'Drag to save as an image file',
  select: 'Drag to select an area, annotate, then pick an action'
}

function captureFilename(at = new Date()): string {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  const d = String(at.getDate()).padStart(2, '0')
  const hh = String(at.getHours()).padStart(2, '0')
  const mm = String(at.getMinutes()).padStart(2, '0')
  const ss = String(at.getSeconds()).padStart(2, '0')
  return `area-capture-${y}${m}${d}-${hh}${mm}${ss}.png`
}

function defaultSaveDir(): string {
  const pictures = join(homedir(), 'Pictures')
  return existsSync(pictures) ? pictures : homedir()
}

function copyPngToClipboard(imagePath: string): Promise<void> {
  const image = nativeImage.createFromPath(imagePath)
  if (image.isEmpty()) throw new Error('Failed to read capture image')
  clipboard.writeImage(image)
  if (process.platform !== 'linux') return Promise.resolve()
  return new Promise((resolve) => {
    const child = spawn('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-i', imagePath], {
      stdio: 'ignore'
    })
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })
}

async function saveCaptureDialog(imagePath: string): Promise<string> {
  const options = {
    title: 'Save capture',
    defaultPath: join(defaultSaveDir(), captureFilename()),
    filters: [{ name: 'PNG image', extensions: ['png'] }]
  }
  const result = historyWindow
    ? await dialog.showSaveDialog(historyWindow, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) throw new Error('Save cancelled')
  const dest = result.filePath.endsWith('.png') ? result.filePath : `${result.filePath}.png`
  copyFileSync(imagePath, dest)
  return dest
}

async function runCapture(requested: OverlayMode): Promise<HistoryItem> {
  if (busy || isOverlayOpen()) {
    throw new Error('A capture is already in progress')
  }
  busy = true
  try {
    emitStatus({ kind: 'info', message: OVERLAY_HINT[requested] })
    const picked = await openOverlay(requested)
    if (!picked || picked.width < 4 || picked.height < 4) {
      throw new Error('Selection cancelled')
    }
    const mode = picked.mode
    let imagePath = picked.imagePath
    if (!imagePath) {
      await delay(80)
      mkdirSync(capturesDir(), { recursive: true, mode: 0o700 })
      imagePath = join(capturesDir(), `${Date.now()}-${randomUUID().slice(0, 8)}.png`)
      await grabRegion(picked, imagePath)
    }

    const item: HistoryItem = {
      id: randomUUID(),
      at: Date.now(),
      kind: mode,
      imagePath
    }

    settings = loadSettings()

    if (mode === 'ocr') {
      const ocr = await recognizeImage(imagePath, settings.ocrModel)
      item.ocr = ocr
      if (ocr.text) clipboard.writeText(ocr.text)
      const preview = ocr.text.trim() || '(no text)'
      notify('OCR copied', preview)
      emitStatus({ kind: 'success', message: ocr.text ? 'OCR text copied to clipboard' : 'No text found' })
    } else if (mode === 'oss') {
      const key = objectKey(settings.ossPrefix)
      const oss = await putLocalFile(imagePath, key)
      try {
        oss.size = statSync(imagePath).size
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
      item.oss = oss
      const copied = oss.url || oss.object
      clipboard.writeText(copied)
      notify('Uploaded to OSS', copied)
      emitStatus({ kind: 'success', message: `Uploaded ${oss.object}` })
    } else if (mode === 'clipboard') {
      await copyPngToClipboard(imagePath)
      notify('Image copied', 'Selection is on the clipboard')
      emitStatus({ kind: 'success', message: 'Image copied to clipboard' })
    } else {
      const savedPath = await saveCaptureDialog(imagePath)
      item.savedPath = savedPath
      notify('Image saved', savedPath)
      emitStatus({ kind: 'success', message: `Saved ${savedPath}` })
    }

    const history = pushHistory(item)
    emitHistory(history)
    return item
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'Selection cancelled' || message === 'Save cancelled') {
      emitStatus({ kind: 'info', message })
    } else {
      emitStatus({ kind: 'error', message })
      notify('Area Capture failed', message)
    }
    throw err
  } finally {
    busy = false
  }
}

function startSelectCapture(): void {
  if (busy || isOverlayOpen()) return
  runCapture('select').catch(() => undefined)
}

async function grabForCompose(rect: ScreenRect): Promise<void> {
  if (!isOverlayOpen()) return
  hideOverlay()
  await delay(80)
  try {
    mkdirSync(capturesDir(), { recursive: true, mode: 0o700 })
    composePath = join(capturesDir(), `${Date.now()}-${randomUUID().slice(0, 8)}.png`)
    await grabRegion(rect, composePath)
    const image = nativeImage.createFromPath(composePath)
    if (image.isEmpty()) throw new Error('Failed to capture the selected area')
    const size = image.getSize()
    revealOverlay()
    sendToOverlay('compose:ready', {
      imagePath: composePath,
      dataUrl: image.toDataURL(),
      width: size.width,
      height: size.height
    })
  } catch (err) {
    composePath = null
    completeOverlay(null)
    const message = err instanceof Error ? err.message : String(err)
    emitStatus({ kind: 'error', message })
    notify('Area Capture failed', message)
  }
}

function bindShortcut(accelerator: string, mode: CaptureMode, label: string): void {
  const ok = globalShortcut.register(accelerator, () => {
    runCapture(mode).catch(() => undefined)
  })
  if (!ok) emitStatus({ kind: 'error', message: `Could not bind ${label} hotkey ${accelerator}` })
}

function registerShortcuts(): void {
  globalShortcut.unregisterAll()
  settings = loadSettings()
  bindShortcut(settings.ocrHotkey, 'ocr', 'OCR')
  bindShortcut(settings.clipboardHotkey, 'clipboard', 'copy image')
  bindShortcut(settings.fileHotkey, 'file', 'save image')
  bindShortcut(settings.ossHotkey, 'oss', 'OSS')
}

function trayTemplate(): MenuItemConstructorOptions[] {
  return [
    { label: 'Capture area', click: () => startSelectCapture() },
    { type: 'separator' },
    { label: 'OCR selected area', accelerator: settings.ocrHotkey, click: () => runCapture('ocr').catch(() => undefined) },
    { label: 'Copy selected area image', accelerator: settings.clipboardHotkey, click: () => runCapture('clipboard').catch(() => undefined) },
    { label: 'Save selected area as image', accelerator: settings.fileHotkey, click: () => runCapture('file').catch(() => undefined) },
    { label: 'Save selected area to OSS', accelerator: settings.ossHotkey, click: () => runCapture('oss').catch(() => undefined) },
    { type: 'separator' },
    { label: 'History', click: () => showHistoryWindow() },
    { label: 'Config', click: () => showConfigWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit() } }
  ]
}

function createTray(): void {
  const image = nativeImage.createFromPath(iconPath())
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 24, height: 24 }))
  tray.setToolTip('Area Capture — click to capture')
  tray.setContextMenu(Menu.buildFromTemplate(trayTemplate()))
  tray.on('click', () => startSelectCapture())
}

function refreshTray(): void {
  tray?.setContextMenu(Menu.buildFromTemplate(trayTemplate()))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => startSelectCapture())

  app.whenReady().then(() => {
  app.setName('Area Capture')
  if (process.platform === 'darwin') app.dock?.hide()

  ipcMain.handle('bootstrap', () => wrap(() => bootstrap()))
  ipcMain.handle('capture:ocr', () => wrap(() => runCapture('ocr')))
  ipcMain.handle('capture:oss', () => wrap(() => runCapture('oss')))
  ipcMain.handle('capture:clipboard', () => wrap(() => runCapture('clipboard')))
  ipcMain.handle('capture:file', () => wrap(() => runCapture('file')))
  ipcMain.handle('capture:select', () => wrap(() => runCapture('select')))
  ipcMain.handle('settings:save', (_event, next: AppSettings) =>
    wrap(() => {
      settings = saveSettings(next)
      registerShortcuts()
      refreshTray()
      return settings
    })
  )
  ipcMain.handle('autostart:get', () => wrap(() => isAutostartEnabled()))
  ipcMain.handle('autostart:set', (_event, enabled: boolean) =>
    wrap(() => {
      setAutostartEnabled(Boolean(enabled))
      return isAutostartEnabled()
    })
  )
  ipcMain.handle('oss:get', () => wrap(() => getOssSource()))
  ipcMain.handle('oss:save', (_event, edit: OssSourceEdit) => wrap(() => saveOssSource(edit)))
  ipcMain.handle('history:clear', () => wrap(() => saveHistory([])))
  ipcMain.handle('copy', (_event, text: string) =>
    wrap(() => {
      clipboard.writeText(text)
      return true
    })
  )
  ipcMain.handle('copy:image', (_event, filePath: string) =>
    wrap(async () => {
      await copyPngToClipboard(filePath)
      return true
    })
  )
  ipcMain.handle('open:url', (_event, url: string) =>
    wrap(async () => {
      if (!/^https?:\/\//i.test(url)) throw new Error('Blocked non-http URL')
      await shell.openExternal(url)
      return true
    })
  )
  ipcMain.handle('open:path', (_event, filePath: string) =>
    wrap(async () => {
      const err = await shell.openPath(filePath)
      if (err) throw new Error(err)
      return true
    })
  )
  ipcMain.on('overlay:region', (_event, rect: ScreenRect) => {
    void grabForCompose(rect)
  })
  ipcMain.handle('overlay:save-compose', (_event, dataUrl: string) =>
    wrap(() => {
      if (!composePath) throw new Error('No capture to save')
      const comma = dataUrl.indexOf(',')
      if (comma < 0) throw new Error('Invalid compose image')
      writeFileSync(composePath, Buffer.from(dataUrl.slice(comma + 1), 'base64'))
      return composePath
    })
  )
  ipcMain.on('overlay:finish', (_event, result: OverlayResult) => {
    composePath = null
    completeOverlay(result)
  })
  ipcMain.on('overlay:cancel', () => {
    composePath = null
    completeOverlay(null)
  })

  createTray()
  registerShortcuts()

  app.on('activate', () => showHistoryWindow())
  })
}

app.on('window-all-closed', () => {
  // Stay resident in the tray.
})

app.on('before-quit', () => {
  quitting = true
  globalShortcut.unregisterAll()
})
