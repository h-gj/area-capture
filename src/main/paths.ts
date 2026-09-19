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
  if (app.isPackaged) {
    const win = join(process.resourcesPath, 'python-runtime', 'python.exe')
    if (existsSync(win)) return win
    for (const name of ['python3', 'python3.11', 'python']) {
      const unix = join(process.resourcesPath, 'python-runtime', 'bin', name)
      if (existsSync(unix)) return unix
    }
  }
  const venv = join(
    projectRoot(),
    '.venv',
    process.platform === 'win32' ? join('Scripts', 'python.exe') : join('bin', 'python')
  )
  if (existsSync(venv)) return venv
  return process.platform === 'win32' ? 'python' : 'python3'
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
