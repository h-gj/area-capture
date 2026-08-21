import { app } from 'electron'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function projectRoot(): string {
  if (app.isPackaged) return process.resourcesPath
  return join(__dirname, '../..')
}

export function iconPath(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'icon.png')
  return join(projectRoot(), 'resources', 'icon.png')
}

export function pythonDir(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'python')
  return join(projectRoot(), 'python')
}

export function pythonBin(): string {
  if (process.env.AREA_CAPTURE_PYTHON) return process.env.AREA_CAPTURE_PYTHON
  const venv = join(projectRoot(), '.venv', 'bin', 'python')
  if (existsSync(venv)) return venv
  return 'python3'
}

export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(base, 'area-capture')
}

export function capturesDir(): string {
  return join(configDir(), 'captures')
}

export function settingsPath(): string {
  return join(configDir(), 'settings.json')
}

export function historyPath(): string {
  return join(configDir(), 'history.json')
}

export function ossConfigPath(): string {
  return join(configDir(), 'oss.json')
}
