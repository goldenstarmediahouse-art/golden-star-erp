export const photographyWeeklyFieldOrder: readonly (
  | { readonly key: string; readonly label: string; readonly type: 'date' }
  | { readonly label: string }
)[]

export function photographyWeeklyFields<T extends {
  field_key: string
  field_type: string
  label: string
}>(fields: T[]): T[]
