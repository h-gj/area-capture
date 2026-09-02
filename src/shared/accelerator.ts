import type { CaptureMode, OverlayHotkeys } from './types'

export type KeyEventLike = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

export const DEFAULT_OVERLAY_HOTKEYS: OverlayHotkeys = {
  overlayClipboardHotkey: 'CommandOrControl+C',
  overlayFileHotkey: 'CommandOrControl+S',
  overlayOcrHotkey: 'CommandOrControl+R',
  overlayOssHotkey: 'CommandOrControl+O',
  overlayStickHotkey: 'CommandOrControl+Shift+D'
}

const MODIFIERS = new Set([
  'commandorcontrol',
  'cmdorctrl',
  'command',
  'cmd',
  'control',
  'ctrl',
  'alt',
  'option',
  'shift',
  'super',
  'meta'
])

function normalizeKey(key: string): string {
  const lower = key.toLowerCase()
  if (lower === 'return') return 'enter'
  if (lower === 'esc') return 'escape'
  if (lower === 'plus') return '+'
  return lower
}

function parseAccelerator(accelerator: string): {
  cmdOrCtrl: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  key: string
} | null {
  const parts = accelerator.split('+').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return null

  let cmdOrCtrl = false
  let ctrl = false
  let meta = false
  let alt = false
  let shift = false
  let key = ''

  for (const part of parts) {
    const token = part.toLowerCase()
    if (token === 'commandorcontrol' || token === 'cmdorctrl') cmdOrCtrl = true
    else if (token === 'command' || token === 'cmd' || token === 'super' || token === 'meta') meta = true
    else if (token === 'control' || token === 'ctrl') ctrl = true
    else if (token === 'alt' || token === 'option') alt = true
    else if (token === 'shift') shift = true
    else if (!MODIFIERS.has(token)) key = normalizeKey(part)
  }

  if (!key) return null
  return { cmdOrCtrl, ctrl, meta, alt, shift, key }
}

export function keyEventFromInput(input: {
  key: string
  code?: string
  control: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}): KeyEventLike {
  let key = input.key
  if ((!key || key.length > 1) && input.code && input.code.startsWith('Key') && input.code.length === 4) {
    key = input.code.slice(3)
  }
  return {
    key,
    ctrlKey: input.control,
    metaKey: input.meta,
    altKey: input.alt,
    shiftKey: input.shift
  }
}

export function eventMatchesAccelerator(event: KeyEventLike, accelerator: string): boolean {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) return false

  const ctrlOk = parsed.cmdOrCtrl ? event.ctrlKey || event.metaKey : event.ctrlKey === parsed.ctrl
  const metaOk = parsed.cmdOrCtrl ? true : event.metaKey === parsed.meta
  return (
    ctrlOk &&
    metaOk &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    normalizeKey(event.key) === parsed.key
  )
}

const OVERLAY_ACTIONS: { mode: CaptureMode; field: keyof OverlayHotkeys }[] = [
  { mode: 'clipboard', field: 'overlayClipboardHotkey' },
  { mode: 'file', field: 'overlayFileHotkey' },
  { mode: 'ocr', field: 'overlayOcrHotkey' },
  { mode: 'oss', field: 'overlayOssHotkey' },
  { mode: 'stick', field: 'overlayStickHotkey' }
]

export function overlayModeForEvent(event: KeyEventLike, hotkeys: OverlayHotkeys): CaptureMode | null {
  for (const action of OVERLAY_ACTIONS) {
    if (eventMatchesAccelerator(event, hotkeys[action.field])) return action.mode
  }
  return null
}

const DISPLAY_MODIFIERS: Record<string, string> = {
  commandorcontrol: 'Ctrl',
  cmdorctrl: 'Ctrl',
  command: 'Cmd',
  cmd: 'Cmd',
  control: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  super: 'Super',
  meta: 'Meta'
}

export function formatAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => DISPLAY_MODIFIERS[part.toLowerCase()] || part.toUpperCase())
    .join('+')
}
