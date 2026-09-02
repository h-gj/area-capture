import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nextStepNumber, stepBadgeRadius } from './compose-step.ts'

describe('nextStepNumber', () => {
  it('starts at 1 when there are no step marks', () => {
    assert.equal(nextStepNumber([]), 1)
    assert.equal(nextStepNumber([{ tool: 'arrow' }]), 1)
  })

  it('counts existing step marks so the next click continues the sequence', () => {
    assert.equal(
      nextStepNumber([{ tool: 'step' }, { tool: 'arrow' }, { tool: 'step' }]),
      3
    )
  })
})

describe('stepBadgeRadius', () => {
  it('grows with stroke width and extra digits', () => {
    const one = stepBadgeRadius(4, '1')
    const ten = stepBadgeRadius(4, '10')
    const thick = stepBadgeRadius(8, '1')
    assert.ok(ten > one)
    assert.ok(thick > one)
  })
})
