import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  eventMatchesAccelerator,
  formatAccelerator,
  overlayModeForEvent
} from './accelerator.ts'

function key(
  partial: Partial<{
    key: string
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    shiftKey: boolean
  }>
) {
  return {
    key: 'a',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...partial
  }
}

describe('eventMatchesAccelerator', () => {
  it('matches CommandOrControl+C when Control and C are pressed', () => {
    assert.equal(
      eventMatchesAccelerator(key({ key: 'c', ctrlKey: true }), 'CommandOrControl+C'),
      true
    )
  })

  it('does not match C without a modifier', () => {
    assert.equal(eventMatchesAccelerator(key({ key: 'c' }), 'CommandOrControl+C'), false)
  })

  it('does not match when extra Shift is held', () => {
    assert.equal(
      eventMatchesAccelerator(key({ key: 'c', ctrlKey: true, shiftKey: true }), 'CommandOrControl+C'),
      false
    )
  })
})

const overlayHotkeys = {
  overlayClipboardHotkey: 'CommandOrControl+C',
  overlayFileHotkey: 'CommandOrControl+S',
  overlayOcrHotkey: 'CommandOrControl+R',
  overlayOssHotkey: 'CommandOrControl+O',
  overlayStickHotkey: 'CommandOrControl+Shift+D'
}

describe('overlayModeForEvent', () => {
  it('maps Ctrl+C to clipboard, Ctrl+S to file, Ctrl+R to ocr, Ctrl+O to oss', () => {
    assert.equal(overlayModeForEvent(key({ key: 'c', ctrlKey: true }), overlayHotkeys), 'clipboard')
    assert.equal(overlayModeForEvent(key({ key: 's', ctrlKey: true }), overlayHotkeys), 'file')
    assert.equal(overlayModeForEvent(key({ key: 'r', ctrlKey: true }), overlayHotkeys), 'ocr')
    assert.equal(overlayModeForEvent(key({ key: 'o', ctrlKey: true }), overlayHotkeys), 'oss')
  })

  it('returns null for an unmatched key', () => {
    assert.equal(overlayModeForEvent(key({ key: 'z', ctrlKey: true }), overlayHotkeys), null)
  })

  it('maps Ctrl+Shift+D to stick', () => {
    assert.equal(
      overlayModeForEvent(key({ key: 'd', ctrlKey: true, shiftKey: true }), overlayHotkeys),
      'stick'
    )
    assert.equal(
      overlayModeForEvent(key({ key: 'D', ctrlKey: true, shiftKey: true }), overlayHotkeys),
      'stick'
    )
  })
})

describe('formatAccelerator', () => {
  it('formats CommandOrControl+C as Ctrl+C', () => {
    assert.equal(formatAccelerator('CommandOrControl+C'), 'Ctrl+C')
  })
})
