export const ECOCASH_TEMPLATE_ID = 'b5beace6-8ed5-4a97-8e65-79ce336bfc9e'

/**
 * @param {string} value
 */
export function dateIsValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * @param {string} weekStart
 * @param {number} offset
 */
export function dateForWeekDay(weekStart, offset) {
  if (!dateIsValid(weekStart)) return ''
  const date = new Date(`${weekStart}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

/**
 * @param {string} start
 * @param {string} end
 */
export function isMondayToSunday(start, end) {
  if (!dateIsValid(start) || !dateIsValid(end)) return false
  const startDate = new Date(`${start}T00:00:00Z`)
  return startDate.getUTCDay() === 1 && dateForWeekDay(start, 6) === end
}

/**
 * @param {string} templateId
 * @param {boolean} submit
 * @param {string} start
 * @param {string} end
 */
export function ecoCashPeriodError(templateId, submit, start, end) {
  if (templateId !== ECOCASH_TEMPLATE_ID) return null

  if (!submit) {
    if ((start && !dateIsValid(start)) || (end && !dateIsValid(end))) {
      return 'Enter valid dates, or leave them blank while saving this draft.'
    }
    return null
  }

  if (!isMondayToSunday(start, end)) {
    return 'EcoCash reports can only be submitted for a week commencing Monday and ending on the following Sunday.'
  }
  return null
}

/**
 * @param {string} value
 */
export function nullableDate(value) {
  return value.trim() || null
}
