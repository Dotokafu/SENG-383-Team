export const ROLE_HOME = {
  parent: '/parent',
  specialist: '/specialist',
  child: '/child',
}

export function homePathFor(role) {
  return ROLE_HOME[role] || '/login'
}