export const SPECIALIST_TYPES = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'psychologist', label: 'Psychologist' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'special_education', label: 'Special education teacher' },
  { value: 'coach', label: 'Coach' },
]

export function typeLabel(value) {
  const found = SPECIALIST_TYPES.find((type) => type.value === value)
  return found ? found.label : value
}