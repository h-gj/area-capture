import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { keyEventFromInput, overlayModeForEvent } from '../shared/accelerator'
import type { CaptureMode, OverlayMode, OverlayResult } from '../shared/types'
import { loadSettings } from './settings'

let overlay: BrowserWindow | null = null
let pending: ((rect: OverlayResult | null) => void) | null = null

function unionBounds(): Electron.Rectangle {
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

export function isOverlayOpen(): boolean {
  return overlay !== null && !overlay.isDestroyed()
}

export function closeOverlay(): void {
  if (overlay && !overlay.isDestroyed()) overlay.close()
  overlay = null
}

export function hideOverlay(): void {
  if (overlay && !overlay.isDestroyed()) overlay.hide()
}

export function revealOverlay(): void {
  if (!overlay || overlay.isDestroyed()) return
  overlay.show()
  overlay.focus()
}

export function sendToOverlay(channel: string, payload: unknown): void {
  if (!overlay || overlay.isDestroyed()) return
  overlay.webContents.send(channel, payload)
}

export function completeOverlay(rect: OverlayResult | null): void {
  const resolve = pending
  pending = null
  closeOverlay()
  resolve?.(rect)
}

export function openOverlay(mode: OverlayMode): Promise<OverlayResult | null> {
  if (isOverlayOpen()) {
    overlay?.focus()
    return Promise.resolve(null)
  }

  const bounds = unionBounds()
  overlay = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    focusable: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setMenuBarVisibility(false)
  overlay.setMenu(null)
  overlay.webContents.setIgnoreMenuShortcuts(true)
  overlay.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const mode = overlayModeForEvent(keyEventFromInput(input), loadSettings())
    if (!mode) return
    event.preventDefault()
    sendToOverlay('overlay:hotkey', mode)
  })

  const finish = new Promise<OverlayResult | null>((resolve) => {
    pending = resolve
  })

  overlay.once('closed', () => {
    overlay = null
    if (pending) {
      const resolve = pending
      pending = null
      resolve(null)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    overlay.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay.html?mode=${mode}`)
  } else {
    overlay.loadFile(join(__dirname, '../renderer/overlay.html'), { query: { mode } })
  }

  overlay.once('ready-to-show', () => {
    overlay?.show()
    overlay?.focus()
  })

  return finish
}
