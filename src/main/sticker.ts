import { BrowserWindow, Menu, Notification, ipcMain, nativeImage, powerMonitor, screen } from 'electron'
import { join } from 'node:path'
import { STICKER_BORDER, clampStickerPosition, scaleStickerBounds } from '../shared/sticker-geometry'
import type { ScreenRect } from '../shared/types'
import { iconPath } from './paths'

const stickers = new Set<BrowserWindow>()
const state = new WeakMap<
  BrowserWindow,
  { imagePath: string; originWidth: number; originHeight: number; scale: number }
>()

type Drag = {
  win: BrowserWindow
  startX: number
  startY: number
  origX: number
  origY: number
}

type StickerIo = {
  copyImage: (imagePath: string) => Promise<void>
  saveImage: (imagePath: string) => Promise<string>
}

let drag: Drag | null = null
let dragTimer: ReturnType<typeof setInterval> | null = null
let ipcBound = false
let io: StickerIo | null = null

export function setStickerIo(next: StickerIo): void {
  io = next
}

function rendererUrl(): string | null {
  return process.env.ELECTRON_RENDERER_URL || null
}

function stopDrag(): void {
  if (dragTimer) {
    clearInterval(dragTimer)
    dragTimer = null
  }
  drag = null
}

function displayUnion(): { x: number; y: number; width: number; height: number } {
  const displays = screen.getAllDisplays()
  let x = Infinity
  let y = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const display of displays) {
    const b = display.bounds
    x = Math.min(x, b.x)
    y = Math.min(y, b.y)
    right = Math.max(right, b.x + b.width)
    bottom = Math.max(bottom, b.y + b.height)
  }
  return { x, y, width: right - x, height: bottom - y }
}

function moveSticker(
  win: BrowserWindow,
  x: number,
  y: number,
  width?: number,
  height?: number
): void {
  const [curW, curH] = win.getSize()
  const w = width ?? curW
  const h = height ?? curH
  const next = clampStickerPosition(x, y, w, h, displayUnion())
  win.setBounds({ x: next.x, y: next.y, width: w, height: h })
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body: body.slice(0, 180), icon: iconPath() }).show()
}

function bindIpc(): void {
  if (ipcBound) return
  ipcBound = true

  ipcMain.on('sticker:drag-start', (event, screenX: number, screenY: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    const [origX, origY] = win.getPosition()
    drag = { win, startX: screenX, startY: screenY, origX, origY }
    if (dragTimer) clearInterval(dragTimer)
    dragTimer = setInterval(() => {
      if (!drag || drag.win.isDestroyed()) {
        stopDrag()
        return
      }
      const point = screen.getCursorScreenPoint()
      moveSticker(
        drag.win,
        Math.round(drag.origX + (point.x - drag.startX)),
        Math.round(drag.origY + (point.y - drag.startY))
      )
    }, 16)
  })

  ipcMain.on('sticker:drag-end', () => {
    stopDrag()
  })

  ipcMain.on('sticker:scale', (event, screenX: number, screenY: number, direction: 1 | -1) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    const current = state.get(win)
    if (!current) return
    const [x, y] = win.getPosition()
    const [width, height] = win.getSize()
    const next = scaleStickerBounds({
      x,
      y,
      width,
      height,
      originWidth: current.originWidth,
      originHeight: current.originHeight,
      scale: current.scale,
      cursorX: screenX,
      cursorY: screenY,
      direction: direction > 0 ? 1 : -1
    })
    current.scale = next.scale
    moveSticker(win, next.x, next.y, next.width, next.height)
    win.webContents.send('sticker:restore')
  })

  ipcMain.on('sticker:menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    stopDrag()
    const current = state.get(win)
    Menu.buildFromTemplate([
      {
        label: 'Copy as image',
        click: () => {
          if (!current || !io) return
          void io.copyImage(current.imagePath).then(() => {
            notify('Image copied', 'Sticker is on the clipboard')
          })
        }
      },
      {
        label: 'Save as image',
        click: () => {
          if (!current || !io) return
          void io
            .saveImage(current.imagePath)
            .then((savedPath) => {
              notify('Image saved', savedPath)
            })
            .catch((err) => {
              const message = err instanceof Error ? err.message : String(err)
              if (message === 'Save cancelled') return
              notify('Save failed', message)
            })
        }
      },
      { type: 'separator' },
      {
        label: 'Delete',
        click: () => {
          if (!win.isDestroyed()) win.close()
        }
      }
    ]).popup({ window: win })
  })

  ipcMain.on('sticker:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    stopDrag()
    if (win && !win.isDestroyed()) win.close()
  })

  const restoreStickers = () => {
    for (const win of stickers) {
      if (win.isDestroyed()) continue
      win.webContents.send('sticker:restore')
    }
  }
  powerMonitor.on('resume', restoreStickers)
  screen.on('display-metrics-changed', restoreStickers)
}

export function closeAllStickers(): void {
  for (const win of [...stickers]) {
    if (!win.isDestroyed()) win.close()
  }
  stickers.clear()
  stopDrag()
}

export function showSticker(imagePath: string, rect: ScreenRect): void {
  bindIpc()
  const image = nativeImage.createFromPath(imagePath)
  if (image.isEmpty()) throw new Error('Failed to read capture image')

  const originWidth = Math.max(1, Math.round(rect.width))
  const originHeight = Math.max(1, Math.round(rect.height))
  const win = new BrowserWindow({
    x: Math.round(rect.x) - STICKER_BORDER,
    y: Math.round(rect.y) - STICKER_BORDER,
    width: originWidth + STICKER_BORDER * 2,
    height: originHeight + STICKER_BORDER * 2,
    useContentSize: true,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    // Cinnamon keeps managed X11 windows on-screen. Chromium creates
    // non-activatable windows as override-redirect, which can hang off-screen.
    focusable: process.platform !== 'linux',
    show: false,
    backgroundColor: '#18181b',
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  if (process.platform === 'linux') win.setFocusable(true)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setMenuBarVisibility(false)
  win.setMenu(null)
  win.webContents.setIgnoreMenuShortcuts(true)
  win.webContents.setBackgroundThrottling(false)

  stickers.add(win)
  state.set(win, { imagePath, originWidth, originHeight, scale: 1 })
  win.on('closed', () => {
    if (drag?.win === win) stopDrag()
    stickers.delete(win)
  })

  const dataUrl = image.toDataURL()
  const sendImage = () => {
    if (win.isDestroyed()) return
    win.webContents.send('sticker:ready', { dataUrl })
  }
  win.webContents.on('did-finish-load', sendImage)
  win.on('show', () => win.webContents.send('sticker:restore'))

  const devUrl = rendererUrl()
  if (devUrl) win.loadURL(`${devUrl}/sticker.html`)
  else win.loadFile(join(__dirname, '../renderer/sticker.html'))

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show()
  })
}
