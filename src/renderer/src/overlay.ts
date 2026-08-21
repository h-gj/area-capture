import './index.css'
import type { CaptureMode, ComposeTool, OverlayResult } from '@shared/types'
import { Composer } from './overlay-compose'

const hint = document.getElementById('hint') as HTMLDivElement
const box = document.getElementById('box') as HTMLDivElement
const shot = document.getElementById('shot') as HTMLImageElement
const canvas = document.getElementById('draw') as HTMLCanvasElement
const textInput = document.getElementById('text-input') as HTMLTextAreaElement
const colorTip = document.getElementById('color-tip') as HTMLDivElement
const pickedSwatch = document.getElementById('picked-swatch') as HTMLButtonElement
const sidebar = document.getElementById('sidebar') as HTMLElement
const preset = new URLSearchParams(location.search).get('mode') || 'select'
const pickAfterSelect = preset === 'select'
const hints: Record<string, string> = {
  ocr: 'Drag to capture · OCR to clipboard · Esc cancels',
  oss: 'Drag to capture · upload to OSS · Esc cancels',
  clipboard: 'Drag to capture · copy image · Esc cancels',
  file: 'Drag to capture · save as PNG · Esc cancels',
  select: 'Drag to select an area · annotate · then pick an action · Esc cancels'
}
hint.textContent = hints[preset] || hints.select

const annotateHint = 'Annotate, then choose an action · Esc cancels · Ctrl+Z undo'
let origin: { x: number; y: number; sx: number; sy: number } | null = null
let selected: OverlayResult | null = null
let composer: Composer | null = null
let finishing = false

function paint(x: number, y: number, w: number, h: number) {
  box.style.display = 'block'
  box.style.left = `${x}px`
  box.style.top = `${y}px`
  box.style.width = `${Math.max(0, w)}px`
  box.style.height = `${Math.max(0, h)}px`
}

function placeSidebar(area: DOMRect) {
  const gap = 8
  const panelW = sidebar.offsetWidth
  const panelH = sidebar.offsetHeight
  let left = area.right + gap
  if (left + panelW > window.innerWidth - gap) {
    left = area.left - panelW - gap
  }
  left = Math.min(Math.max(gap, left), Math.max(gap, window.innerWidth - panelW - gap))
  let top = area.top
  top = Math.min(Math.max(gap, top), Math.max(gap, window.innerHeight - panelH - gap))
  sidebar.style.left = `${Math.round(left)}px`
  sidebar.style.top = `${Math.round(top)}px`
}

function setActive(selector: string, button: HTMLElement | null) {
  if (!button) return
  sidebar.querySelectorAll(selector).forEach((el) => el.classList.remove('active'))
  button.classList.add('active')
}

function applyColor(color: string) {
  if (composer) composer.color = color
  if (pickedSwatch) {
    pickedSwatch.style.background = color
    pickedSwatch.dataset.color = color
  }
  const match = sidebar.querySelector(
    `[data-color="${CSS.escape(color)}"]:not(#picked-swatch)`
  ) as HTMLElement | null
  setActive('[data-color]', match || pickedSwatch)
  stopPicking()
}

function startPicking() {
  if (!composer) return
  composer.commitText()
  composer.picking = true
  document.body.classList.add('picking')
  sidebar.querySelector('[data-action="pick"]')?.classList.add('active')
  hint.textContent = 'Click the capture to pick a color · Esc cancels pick'
}

function stopPicking() {
  if (composer) composer.picking = false
  document.body.classList.remove('picking')
  colorTip.hidden = true
  sidebar.querySelector('[data-action="pick"]')?.classList.remove('active')
  if (document.body.classList.contains('compose')) hint.textContent = annotateHint
}

async function finish(mode: CaptureMode) {
  if (!selected || finishing) return
  finishing = true
  try {
    if (composer) {
      const dataUrl = composer.exportPng()
      const res = await window.api.saveCompose(dataUrl)
      if (!res.ok) throw new Error(res.error)
      window.api.overlayFinish({ ...selected, mode, imagePath: res.data })
      return
    }
    window.api.overlayFinish({ ...selected, mode })
  } catch (err) {
    finishing = false
    hint.textContent = err instanceof Error ? err.message : String(err)
  }
}

function showCompose(dataUrl: string, width: number, height: number) {
  document.body.classList.add('actions', 'compose')
  hint.textContent = annotateHint
  shot.src = dataUrl
  const start = () => {
    if (!composer) {
      composer = new Composer(canvas, shot, textInput)
      composer.setSize(width, height)
      composer.onColor = applyColor
    }
    sidebar.classList.add('open')
    placeSidebar(box.getBoundingClientRect())
  }
  if (shot.complete && shot.naturalWidth > 0) start()
  else shot.addEventListener('load', start, { once: true })
}

window.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return
  if ((event.target as HTMLElement).closest('#sidebar, #text-input, #draw')) return
  if (selected) return
  origin = { x: event.clientX, y: event.clientY, sx: event.screenX, sy: event.screenY }
  paint(origin.x, origin.y, 0, 0)
})

window.addEventListener('mousemove', (event) => {
  if (composer?.picking) {
    if (!(event.target as HTMLElement).closest('#draw')) {
      colorTip.hidden = true
      return
    }
    const color = composer.sample(event)
    if (!color) return
    colorTip.hidden = false
    colorTip.style.background = color
    colorTip.style.left = `${event.clientX + 16}px`
    colorTip.style.top = `${event.clientY + 16}px`
    return
  }
  if (!origin || selected) return
  const x = Math.min(origin.x, event.clientX)
  const y = Math.min(origin.y, event.clientY)
  paint(x, y, Math.abs(event.clientX - origin.x), Math.abs(event.clientY - origin.y))
})

window.addEventListener('mouseup', (event) => {
  if (!origin || event.button !== 0) return
  const x = Math.min(origin.sx, event.screenX)
  const y = Math.min(origin.sy, event.screenY)
  const width = Math.abs(event.screenX - origin.sx)
  const height = Math.abs(event.screenY - origin.sy)
  origin = null
  if (width < 4 || height < 4) {
    window.api.overlayCancel()
    return
  }
  const rect = { x, y, width, height, mode: (preset === 'select' ? 'ocr' : preset) as CaptureMode }
  if (pickAfterSelect) {
    selected = rect
    hint.textContent = 'Capturing…'
    window.api.overlayRegion(rect)
    return
  }
  window.api.overlayFinish(rect)
})

sidebar.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest('button') as HTMLButtonElement | null
  if (!button) return
  if (button.dataset.tool) {
    composer?.commitText()
    stopPicking()
    if (composer) composer.tool = button.dataset.tool as ComposeTool
    setActive('[data-tool]', button)
    return
  }
  if (button.dataset.color) {
    applyColor(button.dataset.color)
    return
  }
  if (button.dataset.width) {
    if (composer) composer.lineWidth = Number(button.dataset.width)
    setActive('[data-width]', button)
    return
  }
  if (button.dataset.action === 'undo') {
    composer?.undo()
    return
  }
  if (button.dataset.action === 'pick') {
    if (composer?.picking) stopPicking()
    else startPicking()
    return
  }
  if (button.dataset.mode) finish(button.dataset.mode as CaptureMode)
})

window.addEventListener('keydown', (event) => {
  if (composer?.editingText) return
  if (composer?.picking && event.key === 'Escape') {
    event.preventDefault()
    stopPicking()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    composer?.undo()
    return
  }
  if (event.key === 'Escape') window.api.overlayCancel()
})

window.api.onComposeReady((payload) => {
  if (selected) selected.imagePath = payload.imagePath
  showCompose(payload.dataUrl, payload.width, payload.height)
})
