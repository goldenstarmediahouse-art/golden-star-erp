export const photographyWeeklyFieldOrder = [
  { key: 'week_start', label: 'Week starting', type: 'date' },
  { key: 'week_end', label: 'Week ending', type: 'date' },
  { label: 'Activities completed this week' },
  { label: 'Targets planned' },
  { label: 'Achievements and results' },
]

/**
 * @template {{ field_key: string; field_type: string; label: string }} T
 * @param {T[]} fields
 * @returns {T[]}
 */
export function photographyWeeklyFields(fields) {
  const orderedFields = photographyWeeklyFieldOrder.map((expected) => {
    const matches = fields.filter((field) => (
      'key' in expected
        ? field.field_key === expected.key && field.field_type === expected.type
        : field.label.trim() === expected.label
    ))
    return matches.length === 1 ? matches[0] : undefined
  })
  if (orderedFields.some((field) => field === undefined)) return []
  return orderedFields.filter((field) => field !== undefined)
}
