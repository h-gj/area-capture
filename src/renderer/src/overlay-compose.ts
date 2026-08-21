import type { ComposeTool } from '@shared/types'

export type Shape = {
  tool: ComposeTool
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width: number
  text?: string
  points?: { x: number; y: number }[]
}

function normRect(x1: number, y1: number, x2: number, y2: number) {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  return { x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

function contrast(color: string): string {
  const hex = color.replace('#', '')
  if (hex.length !== 6) return '#fafafa'
  const n = parseInt(hex, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#18181b' : '#fafafa'
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, source: HTMLImageElement): void {
  ctx.save()
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineWidth = shape.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (shape.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(shape.x1, shape.y1)
    ctx.lineTo(shape.x2, shape.y2)
    ctx.stroke()
  } else if (shape.tool === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(shape.x1, shape.y1)
    ctx.lineTo(shape.x2, shape.y2)
    ctx.stroke()
    const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1)
    const head = 10 + shape.width * 2.5
    ctx.beginPath()
    ctx.moveTo(shape.x2, shape.y2)
    ctx.lineTo(shape.x2 - head * Math.cos(angle - 0.4), shape.y2 - head * Math.sin(angle - 0.4))
    ctx.lineTo(shape.x2 - head * Math.cos(angle + 0.4), shape.y2 - head * Math.sin(angle + 0.4))
    ctx.closePath()
    ctx.fill()
  } else if (shape.tool === 'rect') {
    const r = normRect(shape.x1, shape.y1, shape.x2, shape.y2)
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  } else if (shape.tool === 'ellipse') {
    const cx = (shape.x1 + shape.x2) / 2
    const cy = (shape.y1 + shape.y2) / 2
    const rx = Math.abs(shape.x2 - shape.x1) / 2
    const ry = Math.abs(shape.y2 - shape.y1) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (shape.tool === 'pen' && shape.points && shape.points.length > 0) {
    ctx.beginPath()
    ctx.moveTo(shape.points[0].x, shape.points[0].y)
    for (const point of shape.points) ctx.lineTo(point.x, point.y)
    ctx.stroke()
  } else if (shape.tool === 'blur') {
    const r = normRect(shape.x1, shape.y1, shape.x2, shape.y2)
    if (r.w > 1 && r.h > 1) {
      ctx.beginPath()
      ctx.rect(r.x, r.y, r.w, r.h)
      ctx.clip()
      ctx.filter = `blur(${Math.max(8, shape.width * 3)}px)`
      ctx.drawImage(source, 0, 0, ctx.canvas.width, ctx.canvas.height)
    }
  } else if (shape.tool === 'text' && shape.text) {
    const size = 14 + shape.width * 4
    ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`
    ctx.textBaseline = 'top'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, size / 8)
    ctx.strokeStyle = contrast(shape.color)
    const lines = shape.text.split('\n')
    let y = shape.y1
    for (const line of lines) {
      ctx.strokeText(line, shape.x1, y)
      ctx.fillText(line, shape.x1, y)
      y += size * 1.25
    }
  }

  ctx.restore()
}

export class Composer {
  tool: ComposeTool = 'arrow'
  color = '#e11d48'
  lineWidth = 4
  picking = false
  shapes: Shape[] = []
  onColor: ((color: string) => void) | null = null

  private draft: Shape | null = null
  private drawing = false
  private textPos: { x: number; y: number; clientX: number; clientY: number } | null = null
  private readonly ctx: CanvasRenderingContext2D

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly image: HTMLImageElement,
    private readonly textEl: HTMLTextAreaElement
  ) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas is not available')
    this.ctx = ctx
    this.attach()
  }

  get editingText(): boolean {
    return this.textPos !== null
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.redraw()
  }

  undo(): void {
    if (this.editingText) {
      this.cancelText()
      return
    }
    this.shapes.pop()
    this.redraw()
  }

  exportPng(): string {
    this.commitText()
    this.draft = null
    this.redraw()
    return this.canvas.toDataURL('image/png')
  }

  redraw(): void {
    const { ctx, canvas, image } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (image.naturalWidth > 0) ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const shape of this.shapes) drawShape(ctx, shape, image)
    if (this.draft) drawShape(ctx, this.draft, image)
  }

  sample(event: MouseEvent): string | null {
    try {
      const p = this.canvasPoint(event)
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
      const x = Math.max(0, Math.min(this.canvas.width - 1, Math.floor(p.x)))
      const y = Math.max(0, Math.min(this.canvas.height - 1, Math.floor(p.y)))
      if (this.canvas.width < 1 || this.canvas.height < 1) return null
      const pixel = this.ctx.getImageData(x, y, 1, 1).data
      return toHex(pixel[0], pixel[1], pixel[2])
    } catch {
      return null
    }
  }

  applyPicked(color: string): void {
    this.color = color
    this.picking = false
    this.onColor?.(color)
  }

  private canvasPoint(event: MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - r.left) * this.canvas.width) / r.width,
      y: ((event.clientY - r.top) * this.canvas.height) / r.height
    }
  }

  private attach(): void {
    this.canvas.addEventListener('mousedown', (event) => this.onDown(event))
    window.addEventListener('mousemove', (event) => this.onMove(event))
    window.addEventListener('mouseup', (event) => this.onUp(event))
    this.textEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.commitText()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        this.cancelText()
      }
    })
  }

  private onDown(event: MouseEvent): void {
    if (event.button !== 0) return
    event.preventDefault()
    if (this.picking) {
      const color = this.sample(event)
      if (color) this.applyPicked(color)
      return
    }
    const p = this.canvasPoint(event)
    if (this.tool === 'text') {
      this.commitText()
      this.textPos = { ...p, clientX: event.clientX, clientY: event.clientY }
      this.textEl.hidden = false
      this.textEl.value = ''
      this.textEl.style.left = `${event.clientX}px`
      this.textEl.style.top = `${event.clientY}px`
      this.textEl.style.color = this.color
      this.textEl.focus()
      return
    }
    this.drawing = true
    this.draft = {
      tool: this.tool,
      x1: p.x,
      y1: p.y,
      x2: p.x,
      y2: p.y,
      color: this.color,
      width: this.lineWidth,
      points: this.tool === 'pen' ? [{ x: p.x, y: p.y }] : undefined
    }
    this.redraw()
  }

  private onMove(event: MouseEvent): void {
    if (!this.drawing || !this.draft) return
    const p = this.canvasPoint(event)
    this.draft.x2 = p.x
    this.draft.y2 = p.y
    if (this.draft.points) this.draft.points.push(p)
    this.redraw()
  }

  private onUp(event: MouseEvent): void {
    if (!this.drawing || !this.draft) return
    if (event.button !== 0) return
    const p = this.canvasPoint(event)
    this.draft.x2 = p.x
    this.draft.y2 = p.y
    const small =
      this.draft.tool !== 'pen' &&
      Math.abs(this.draft.x2 - this.draft.x1) < 2 &&
      Math.abs(this.draft.y2 - this.draft.y1) < 2
    if (!small) this.shapes.push(this.draft)
    this.draft = null
    this.drawing = false
    this.redraw()
  }

  commitText(): void {
    if (!this.textPos) return
    const text = this.textEl.value.trim()
    if (text) {
      this.shapes.push({
        tool: 'text',
        x1: this.textPos.x,
        y1: this.textPos.y,
        x2: this.textPos.x,
        y2: this.textPos.y,
        color: this.color,
        width: this.lineWidth,
        text
      })
    }
    this.cancelText()
    this.redraw()
  }

  cancelText(): void {
    this.textPos = null
    this.textEl.hidden = true
    this.textEl.value = ''
  }
}
