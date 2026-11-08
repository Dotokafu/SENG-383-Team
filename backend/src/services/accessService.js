const childRepository = require('../repositories/childRepository');


function canAccessChild(user, childId) {
  if (!user || !Number.isInteger(childId)) return false;

  const child = childRepository.findById(childId);
  if (!child) return false;

  switch (user.role) {
    case 'parent':
      return child.parent_id === user.id;
    case 'child':
      return child.user_id === user.id;
    case 'specialist':
      return childRepository.isSpecialistLinked(child.id, user.id);
    default:
      return false;
  }
}

module.exports = { canAccessChild };