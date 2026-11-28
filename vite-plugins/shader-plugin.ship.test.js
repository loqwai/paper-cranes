import { it, expect } from 'vitest'
import { isShippedController } from './shader-plugin.js'

it('copies controllers to dist but leaves their tests behind', () => {
  expect(isShippedController('controllers/clit-set.js')).toBe(true)
  expect(isShippedController('controllers')).toBe(true)
  expect(isShippedController('controllers/clit-set.test.js')).toBe(false)
  expect(isShippedController('controllers/x.spec.mjs')).toBe(false)
})
