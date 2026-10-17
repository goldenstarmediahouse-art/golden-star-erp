import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ECOCASH_TEMPLATE_ID,
  ecoCashPeriodError,
  nullableDate,
} from '../lib/reports/ecocash-period.mjs'

test('blank dates are accepted and normalized to null for EcoCash drafts', () => {
  assert.equal(ecoCashPeriodError(ECOCASH_TEMPLATE_ID, false, '', ''), null)
  assert.equal(nullableDate(''), null)
  assert.equal(nullableDate('  '), null)
})

test('a Monday through Sunday EcoCash week can be submitted', () => {
  assert.equal(
    ecoCashPeriodError(ECOCASH_TEMPLATE_ID, true, '2026-01-05', '2026-01-11'),
    null,
  )
})

test('an invalid EcoCash week is rejected on final submission', () => {
  assert.match(
    ecoCashPeriodError(ECOCASH_TEMPLATE_ID, true, '2026-01-06', '2026-01-12'),
    /commencing Monday and ending on the following Sunday/,
  )
  assert.match(
    ecoCashPeriodError(ECOCASH_TEMPLATE_ID, true, '2026-01-05', '2026-01-12'),
    /commencing Monday and ending on the following Sunday/,
  )
})

test('the EcoCash week rule does not apply to other templates', () => {
  assert.equal(ecoCashPeriodError('another-template', true, '2026-01-06', '2026-01-12'), null)
})
