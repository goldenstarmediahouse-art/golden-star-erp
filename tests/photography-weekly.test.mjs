import assert from 'node:assert/strict'
import test from 'node:test'
import { photographyWeeklyFields } from '../lib/reports/photography-weekly.mjs'

const expectedLabels = [
  'Week starting',
  'Week ending',
  'Activities completed this week',
  'Targets planned',
  'Achievements and results',
]

function field(id, field_key, label, field_type, sort_order, is_required) {
  return { id, field_key, label, field_type, sort_order, is_required }
}

test('selects only the five Photography fields in the requested order with metadata intact', () => {
  const fields = [
    field('extra', 'equipment_issues', 'Equipment issues', 'textarea', 20, false),
    field('results', 'results', 'Achievements and results', 'textarea', 5, true),
    field('start', 'week_start', 'Week starting', 'date', 1, true),
    field('activities', 'activity_log', 'Activities completed this week', 'textarea', 11, false),
    field('end', 'week_end', 'Week ending', 'date', 2, true),
    field('targets', 'target_plan', 'Targets planned', 'text', 4, false),
  ]

  const selected = photographyWeeklyFields(fields)

  assert.deepEqual(selected.map(({ label }) => label), expectedLabels)
  assert.deepEqual(selected.map(({ id }) => id), ['start', 'end', 'activities', 'targets', 'results'])
  assert.equal(selected[2].field_key, 'activity_log')
  assert.equal(selected[2].field_type, 'textarea')
  assert.equal(selected[2].is_required, false)
  assert.equal(selected[2].sort_order, 11)
})

test('returns no fields rather than render stale data when a requested field is missing or duplicated', () => {
  const complete = [
    field('start', 'week_start', 'Week starting', 'date', 1, true),
    field('end', 'week_end', 'Week ending', 'date', 2, true),
    field('activities', 'activity_log', 'Activities completed this week', 'textarea', 3, true),
    field('targets', 'target_plan', 'Targets planned', 'text', 4, true),
    field('results', 'results', 'Achievements and results', 'textarea', 5, true),
  ]

  assert.deepEqual(photographyWeeklyFields(complete.slice(1)), [])
  assert.deepEqual(photographyWeeklyFields([...complete, { ...complete[0], id: 'duplicate-start' }]), [])
})
