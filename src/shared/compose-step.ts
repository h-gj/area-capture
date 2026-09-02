export function nextStepNumber(shapes: { tool: string }[]): number {
  return shapes.filter((shape) => shape.tool === 'step').length + 1
}

export function stepBadgeRadius(width: number, label: string): number {
  return 8 + width * 3 + Math.max(0, label.length - 1) * 4
}
