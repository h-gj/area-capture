import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { app } from 'electron'
import { iconPath, projectRoot } from './paths'

function autostartDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(base, 'autostart')
}

export function autostartPath(): string {
  return join(autostartDir(), 'area-capture.desktop')
}

export function isAutostartEnabled(): boolean {
  return existsSync(autostartPath())
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function autostartExec(): string {
  if (app.isPackaged) {
    return `${shellQuote(process.execPath)} --hidden`
  }
  return `${shellQuote(join(projectRoot(), 'scripts', 'start.sh'))} --hidden`
}

function desktopEntry(): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    'Name=Area Capture',
    'Comment=Selected-area OCR and screenshot helper',
    `Exec=${autostartExec()}`,
    `Icon=${iconPath()}`,
    'Terminal=false',
    'Categories=Utility;',
    'StartupNotify=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')
}

export function setAutostartEnabled(enabled: boolean): void {
  const file = autostartPath()
  if (!enabled) {
    try {
      unlinkSync(file)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    return
  }
  mkdirSync(dirname(file), { recursive: true, mode: 0o755 })
  writeFileSync(file, desktopEntry(), { mode: 0o644 })
}

export function startHidden(): boolean {
  return process.argv.includes('--hidden') || process.env.AREA_CAPTURE_HIDDEN === '1'
}
