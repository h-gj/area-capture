import { useEffect, useState } from 'react'
import type { AppSettings, Bootstrap, OssSourceEdit, StatusEvent } from '@shared/types'
import { Button } from './ui'

const emptySettings: AppSettings = {
  ossPrefix: 'attachment/area-capture',
  ocrModel: 'ppocrv4-mobile',
  ocrHotkey: 'CommandOrControl+Shift+Alt+O',
  ossHotkey: 'CommandOrControl+Shift+Alt+S',
  clipboardHotkey: 'CommandOrControl+Shift+Alt+C',
  fileHotkey: 'CommandOrControl+Shift+Alt+F'
}

const emptyOss: OssSourceEdit = {
  id: '',
  label: '',
  region: 'oss-cn-shenzhen',
  endpoint: 'oss-cn-shenzhen.aliyuncs.com',
  bucket: '',
  accessKeyId: '',
  accessKeySecret: '',
  timeout: 60000,
  writable: true
}

const fieldClass = 'h-9 rounded-md border border-input bg-background px-2'

export default function ConfigPage() {
  const [boot, setBoot] = useState<Bootstrap | null>(null)
  const [settings, setSettings] = useState<AppSettings>(emptySettings)
  const [oss, setOss] = useState<OssSourceEdit>(emptyOss)
  const [autostart, setAutostart] = useState(false)
  const [status, setStatus] = useState<StatusEvent | null>(null)
  const [error, setError] = useState('')
  const [savingOss, setSavingOss] = useState(false)

  useEffect(() => {
    window.api.bootstrap().then((res) => {
      if (!res.ok) {
        setError(res.error)
        return
      }
      setBoot(res.data)
      setSettings(res.data.settings)
      setOss(res.data.oss)
      setAutostart(res.data.autostartEnabled)
    })
    return window.api.onStatus((event) => setStatus(event))
  }, [])

  async function persist(next: AppSettings) {
    setSettings(next)
    const res = await window.api.saveSettings(next)
    if (!res.ok) setError(res.error)
    else setError('')
  }

  async function saveOss() {
    setSavingOss(true)
    const res = await window.api.saveOssSource(oss)
    setSavingOss(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setError('')
    setOss(res.data)
    setStatus({ kind: 'success', message: `Saved OSS config to ${boot?.ossConfigPath || '~/.config/area-capture/oss.json'}` })
  }

  async function toggleAutostart(enabled: boolean) {
    setAutostart(enabled)
    const res = await window.api.setAutostart(enabled)
    if (!res.ok) {
      setAutostart(!enabled)
      setError(res.error)
      return
    }
    setError('')
    setStatus({
      kind: 'success',
      message: enabled ? 'Will start with the system' : 'Disabled start with system'
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">Config</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Autostart, OCR, OSS, and hotkeys. Changes apply immediately.
          </p>
        </header>

        {status ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              status.kind === 'error'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border bg-muted'
            }`}
          >
            {status.message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">General</h2>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900"
              checked={autostart}
              onChange={(e) => toggleAutostart(e.target.checked)}
            />
            <span>Start with system</span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Adds a login entry at `~/.config/autostart/area-capture.desktop`. The app starts in the
            tray without opening a window.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">OCR</h2>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">OCR model</span>
            <select
              className={fieldClass}
              value={settings.ocrModel}
              onChange={(e) => persist({ ...settings, ocrModel: e.target.value })}
            >
              {(boot?.ocrModels.length
                ? boot.ocrModels
                : [{ id: 'ppocrv4-mobile', name: 'PP-OCRv4 Mobile' }]
              ).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">OSS</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Label</span>
              <input
                className={fieldClass}
                value={oss.label}
                onChange={(e) => setOss({ ...oss, label: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Bucket</span>
              <input
                className={fieldClass}
                value={oss.bucket}
                onChange={(e) => setOss({ ...oss, bucket: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Region</span>
              <input
                className={fieldClass}
                placeholder="oss-cn-shenzhen"
                value={oss.region}
                onChange={(e) => setOss({ ...oss, region: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Endpoint</span>
              <input
                className={fieldClass}
                placeholder="oss-cn-shenzhen.aliyuncs.com"
                value={oss.endpoint}
                onChange={(e) => setOss({ ...oss, endpoint: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">AccessKey ID</span>
              <input
                className={fieldClass}
                autoComplete="off"
                value={oss.accessKeyId}
                onChange={(e) => setOss({ ...oss, accessKeyId: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">AccessKey Secret</span>
              <input
                className={fieldClass}
                type="password"
                autoComplete="off"
                value={oss.accessKeySecret}
                onChange={(e) => setOss({ ...oss, accessKeySecret: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Timeout (ms)</span>
              <input
                className={fieldClass}
                type="number"
                min={1000}
                value={oss.timeout}
                onChange={(e) => setOss({ ...oss, timeout: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-end gap-3 pb-1 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                checked={oss.writable}
                onChange={(e) => setOss({ ...oss, writable: e.target.checked })}
              />
              <span>Writable</span>
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Object prefix</span>
              <input
                className={fieldClass}
                value={settings.ossPrefix}
                onChange={(e) => setSettings({ ...settings, ossPrefix: e.target.value })}
                onBlur={() => persist(settings)}
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Saved to `{boot?.ossConfigPath || '~/.config/area-capture/oss.json'}`.
            </p>
            <Button disabled={savingOss} onClick={() => saveOss()}>
              Save OSS
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">Hotkeys</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">OCR hotkey</span>
              <input
                className={fieldClass}
                value={settings.ocrHotkey}
                onChange={(e) => setSettings({ ...settings, ocrHotkey: e.target.value })}
                onBlur={() => persist(settings)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Copy image hotkey</span>
              <input
                className={fieldClass}
                value={settings.clipboardHotkey}
                onChange={(e) => setSettings({ ...settings, clipboardHotkey: e.target.value })}
                onBlur={() => persist(settings)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Save image hotkey</span>
              <input
                className={fieldClass}
                value={settings.fileHotkey}
                onChange={(e) => setSettings({ ...settings, fileHotkey: e.target.value })}
                onBlur={() => persist(settings)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">OSS hotkey</span>
              <input
                className={fieldClass}
                value={settings.ossHotkey}
                onChange={(e) => setSettings({ ...settings, ossHotkey: e.target.value })}
                onBlur={() => persist(settings)}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}
