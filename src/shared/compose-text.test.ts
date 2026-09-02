import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hitTopTextShape,
  pointerMovedEnough,
  textBlockBounds,
  textFontSize
} from './compose-text.ts'

const measure = (line: string, size: number) => line.length * size * 0.5

describe('textFontSize', () => {
  it('scales with the stroke width used when drawing', () => {
    assert.equal(textFontSize(4), 30)
  })
})

describe('textBlockBounds', () => {
  it('covers wrapped lines from the top-left of the label', () => {
    const box = textBlockBounds(10, 20, 4, 'Hi\nThere', measure)
    assert.equal(box.x, 6)
    assert.equal(box.y, 16)
    assert.ok(box.w > 20)
    assert.ok(box.h > 30)
  })
})

describe('hitTopTextShape', () => {
  it('returns -1 when the point is not on any text', () => {
    assert.equal(
      hitTopTextShape(0, 0, [{ tool: 'arrow', x1: 10, y1: 10, width: 4, text: 'Hi' }], measure),
      -1
    )
  })

  it('picks the topmost overlapping text shape', () => {
    const shapes = [
      { tool: 'text' as const, x1: 10, y1: 10, width: 4, text: 'A' },
      { tool: 'text' as const, x1: 12, y1: 12, width: 4, text: 'B' }
    ]
    const inner = hitTopTextShape(14, 14, shapes, measure)
    assert.equal(inner, 1)
  })
})

describe('pointerMovedEnough', () => {
  it('treats a small jitter as a click and a longer drag as a move', () => {
    assert.equal(pointerMovedEnough(1, 1), false)
    assert.equal(pointerMovedEnough(5, 0), true)
  })
})
