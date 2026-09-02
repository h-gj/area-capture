import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  STICKER_BORDER,
  STICKER_KEEP_ON_SCREEN,
  clampStickerPosition,
  scaleStickerBounds
} from './sticker-geometry.ts'

describe('scaleStickerBounds', () => {
  it('keeps the content pixel under the cursor fixed when zooming in', () => {
    const next = scaleStickerBounds({
      x: 0,
      y: 0,
      width: 200 + STICKER_BORDER * 2,
      height: 100 + STICKER_BORDER * 2,
      originWidth: 200,
      originHeight: 100,
      scale: 1,
      cursorX: STICKER_BORDER + 100,
      cursorY: STICKER_BORDER + 50,
      direction: 1
    })
    assert.equal(next.scale, 1.1)
    assert.equal(next.width, Math.round(200 * 1.1) + STICKER_BORDER * 2)
    assert.equal(next.height, Math.round(100 * 1.1) + STICKER_BORDER * 2)
    assert.equal(next.x, -10)
    assert.equal(next.y, -5)
  })

  it('does not scale past 8x', () => {
    const next = scaleStickerBounds({
      x: 0,
      y: 0,
      width: 1600 + STICKER_BORDER * 2,
      height: 800 + STICKER_BORDER * 2,
      originWidth: 200,
      originHeight: 100,
      scale: 8,
      cursorX: 10,
      cursorY: 10,
      direction: 1
    })
    assert.equal(next.scale, 8)
    assert.equal(next.width, 1600 + STICKER_BORDER * 2)
    assert.equal(next.height, 800 + STICKER_BORDER * 2)
  })
})

describe('clampStickerPosition', () => {
  const screen = { x: 0, y: 0, width: 1920, height: 1080 }

  it('lets a sticker hang off the left edge while keeping a strip on screen', () => {
    const next = clampStickerPosition(-500, 10, 200, 100, screen)
    assert.equal(next.x, STICKER_KEEP_ON_SCREEN - 200)
    assert.equal(next.y, 10)
  })

  it('lets a sticker hang off the right and bottom edges', () => {
    const next = clampStickerPosition(3000, 2000, 200, 100, screen)
    assert.equal(next.x, 1920 - STICKER_KEEP_ON_SCREEN)
    assert.equal(next.y, 1080 - STICKER_KEEP_ON_SCREEN)
  })
})
