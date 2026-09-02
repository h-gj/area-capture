export const STICKER_BORDER = 7
export const STICKER_MIN_SCALE = 0.2
export const STICKER_MAX_SCALE = 8
export const STICKER_SCALE_FACTOR = 1.1
export const STICKER_KEEP_ON_SCREEN = 48

export function clampStickerPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  area: { x: number; y: number; width: number; height: number },
  keep = STICKER_KEEP_ON_SCREEN
): { x: number; y: number } {
  const keepX = Math.min(keep, width, area.width)
  const keepY = Math.min(keep, height, area.height)
  const minX = area.x + keepX - width
  const maxX = area.x + area.width - keepX
  const minY = area.y + keepY - height
  const maxY = area.y + area.height - keepY
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, x))),
    y: Math.round(Math.min(maxY, Math.max(minY, y)))
  }
}

export type StickerScaleInput = {
  x: number
  y: number
  width: number
  height: number
  originWidth: number
  originHeight: number
  scale: number
  cursorX: number
  cursorY: number
  direction: 1 | -1
  border?: number
}

export type StickerScaleResult = {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

export function nextStickerScale(scale: number, direction: 1 | -1): number {
  const next = direction > 0 ? scale * STICKER_SCALE_FACTOR : scale / STICKER_SCALE_FACTOR
  return Math.min(STICKER_MAX_SCALE, Math.max(STICKER_MIN_SCALE, next))
}

export function scaleStickerBounds(input: StickerScaleInput): StickerScaleResult {
  const border = input.border ?? STICKER_BORDER
  const scale = nextStickerScale(input.scale, input.direction)
  const contentW = Math.max(1, Math.round(input.originWidth * scale))
  const contentH = Math.max(1, Math.round(input.originHeight * scale))
  const width = contentW + border * 2
  const height = contentH + border * 2
  const oldContentW = Math.max(1, input.width - border * 2)
  const oldContentH = Math.max(1, input.height - border * 2)
  const relX = (input.cursorX - input.x - border) / oldContentW
  const relY = (input.cursorY - input.y - border) / oldContentH
  const rx = Number.isFinite(relX) ? Math.min(1, Math.max(0, relX)) : 0.5
  const ry = Number.isFinite(relY) ? Math.min(1, Math.max(0, relY)) : 0.5
  return {
    x: Math.round(input.cursorX - border - rx * contentW),
    y: Math.round(input.cursorY - border - ry * contentH),
    width,
    height,
    scale
  }
}
