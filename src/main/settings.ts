import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_OVERLAY_HOTKEYS } from '../shared/accelerator'
import type { AppSettings, HistoryItem } from '../shared/types'
import { configDir, historyPath, settingsPath } from './paths'

export const DEFAULT_SETTINGS: AppSettings = {
  ossPrefix: 'attachment/area-capture',
  ocrModel: 'ppocrv4-mobile',
  ocrHotkey: 'CommandOrControl+Shift+Alt+O',
  ossHotkey: 'CommandOrControl+Shift+Alt+S',
  clipboardHotkey: 'CommandOrControl+Shift+Alt+C',
  fileHotkey: 'CommandOrControl+Shift+Alt+F',
  stickHotkey: 'CommandOrControl+Shift+D',
  ...DEFAULT_OVERLAY_HOTKEYS
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw err
  }
}

export function loadSettings(): AppSettings {
  const data = readJson<Partial<AppSettings>>(settingsPath(), {})
  return { ...DEFAULT_SETTINGS, ...data }
}

export function saveSettings(settings: AppSettings): AppSettings {
  mkdirSync(dirname(settingsPath()), { recursive: true, mode: 0o700 })
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2) + '\n', { mode: 0o600 })
  return settings
}

export function loadHistory(): HistoryItem[] {
  const items = readJson<HistoryItem[]>(historyPath(), [])
  return Array.isArray(items) ? items.slice(0, 50) : []
}

export function saveHistory(items: HistoryItem[]): HistoryItem[] {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 })
  const trimmed = items.slice(0, 50)
  writeFileSync(historyPath(), JSON.stringify(trimmed, null, 2) + '\n', { mode: 0o600 })
  return trimmed
}

export function pushHistory(item: HistoryItem): HistoryItem[] {
  const next = [item, ...loadHistory().filter((row) => row.id !== item.id)]
  return saveHistory(next)
}
