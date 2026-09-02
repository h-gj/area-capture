export const TEXT_MOVE_THRESHOLD = 4
export const TEXT_HIT_PAD = 4

export function textFontSize(strokeWidth: number): number {
  return 14 + strokeWidth * 4
}

export function textLineHeight(fontSize: number): number {
  return fontSize * 1.25
}

export function textBlockBounds(
  x: number,
  y: number,
  strokeWidth: number,
  text: string,
  measureLine: (line: string, fontSize: number) => number,
  pad = TEXT_HIT_PAD
): { x: number; y: number; w: number; h: number } {
  const fontSize = textFontSize(strokeWidth)
  const lines = text.split('\n')
  let maxW = 0
  for (const line of lines) maxW = Math.max(maxW, measureLine(line, fontSize))
  return {
    x: x - pad,
    y: y - pad,
    w: maxW + pad * 2,
    h: textLineHeight(fontSize) * Math.max(1, lines.length) + pad * 2
  }
}

export function hitTopTextShape(
  px: number,
  py: number,
  shapes: Array<{ tool: string; x1: number; y1: number; width: number; text?: string }>,
  measureLine: (line: string, fontSize: number) => number
): number {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]
    if (shape.tool !== 'text' || !shape.text) continue
    const box = textBlockBounds(shape.x1, shape.y1, shape.width, shape.text, measureLine)
    if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) return i
  }
  return -1
}

export function pointerMovedEnough(dx: number, dy: number, threshold = TEXT_MOVE_THRESHOLD): boolean {
  return Math.hypot(dx, dy) >= threshold
}
