import { useEffect, useState } from 'react'
import { Check, ClipboardCopy, Copy, ExternalLink, FolderDown, Trash2 } from 'lucide-react'
import type { CaptureMode, HistoryItem, StatusEvent } from '@shared/types'
import ConfigPage from './Config'
import { Button } from './ui'

function formatTime(at: number): string {
  return new Date(at).toLocaleString()
}

function kindLabel(kind: CaptureMode): string {
  if (kind === 'ocr') return 'OCR'
  if (kind === 'oss') return 'OSS'
  if (kind === 'clipboard') return 'Clipboard'
  if (kind === 'stick') return 'Stick'
  return 'File'
}

function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [status, setStatus] = useState<StatusEvent | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.bootstrap().then((res) => {
      if (!res.ok) {
        setError(res.error)
        return
      }
      setHistory(res.data.history)
    })
    const offStatus = window.api.onStatus((event) => setStatus(event))
    const offHistory = window.api.onHistory((items) => setHistory(items))
    return () => {
      offStatus()
      offHistory()
    }
  }, [])

  async function copy(text: string, id: string) {
    const res = await window.api.copy(text)
    if (res.ok) {
      setCopied(id)
      setTimeout(() => setCopied(null), 1200)
    }
  }

  async function copyImage(path: string, id: string) {
    const res = await window.api.copyImage(path)
    if (res.ok) {
      setCopied(id)
      setTimeout(() => setCopied(null), 1200)
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recent captures from the tray.</p>
        </header>

        {status ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              status.kind === 'error'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : status.kind === 'success'
                  ? 'border-border bg-muted'
                  : 'border-border bg-card'
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Captures</h2>
            <Button
              variant="ghost"
              onClick={async () => {
                const res = await window.api.clearHistory()
                if (res.ok) setHistory(res.data)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No captures yet. Click the tray icon to capture.</p>
          ) : (
            <ul className="grid gap-3">
              {history.slice(0, 5).map((item) => {
                const text = item.kind === 'ocr' ? item.ocr?.text || '' : item.oss?.url || item.oss?.object || ''
                const imageId = `${item.id}-image`
                return (
                  <li key={item.id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {kindLabel(item.kind)} · {formatTime(item.at)}
                        {item.ocr ? ` · ${item.ocr.model_name} · ${item.ocr.elapsed_ms}ms` : ''}
                        {item.oss ? ` · ${item.oss.bucket}` : ''}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        {item.imagePath ? (
                          <Button variant="ghost" onClick={() => copyImage(item.imagePath, imageId)}>
                            {copied === imageId ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                            Copy image
                          </Button>
                        ) : null}
                        {text ? (
                          <Button variant="ghost" onClick={() => copy(text, item.id)}>
                            {copied === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            Copy
                          </Button>
                        ) : null}
                        {item.oss?.url ? (
                          <Button variant="ghost" onClick={() => window.api.openUrl(item.oss!.url!)}>
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </Button>
                        ) : null}
                        {item.savedPath ? (
                          <Button variant="ghost" onClick={() => window.api.openPath(item.savedPath!)}>
                            <FolderDown className="h-4 w-4" />
                            Open file
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {item.kind === 'ocr' ? (
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm">
                        {item.ocr?.text || '(no text)'}
                      </pre>
                    ) : item.kind === 'oss' ? (
                      <p className="break-all text-sm">{item.oss?.url || item.oss?.object}</p>
                    ) : item.kind === 'file' ? (
                      <p className="break-all text-sm">{item.savedPath || item.imagePath}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Image copied to clipboard</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default function App() {
  const page = new URLSearchParams(window.location.search).get('page')
  if (page === 'config') return <ConfigPage />
  return <HistoryPage />
}
