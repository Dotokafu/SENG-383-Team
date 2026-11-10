// The development areas a task can belong to.
// The values must match the CHECK constraint on tasks.area in backend/src/schema.js.
export const AREAS = [
  { value: 'language', label: 'Language' },
  { value: 'motor', label: 'Motor' },
  { value: 'social', label: 'Social' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'cognitive', label: 'Cognitive' },
  { value: 'self_care', label: 'Self-care' },
]

export function areaLabel(value) {
  const area = AREAS.find((a) => a.value === value)
  return area ? area.label : value
}