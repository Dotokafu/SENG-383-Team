const userRepository = require('../repositories/userRepository');
const childRepository = require('../repositories/childRepository');
const linkRepository = require('../repositories/specialistLinkRepository');

const SPECIALIST_TYPES = ['teacher', 'psychologist', 'doctor', 'special_education', 'coach'];

class LinkError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}


function linkSpecialist(childId, email, type) {
  if (typeof email !== 'string' || email.trim() === '') {
    throw new LinkError(400, 'A specialist email is required');
  }
  if (!SPECIALIST_TYPES.includes(type)) {
    throw new LinkError(400, `Specialist type must be one of: ${SPECIALIST_TYPES.join(', ')}`);
  }

  const specialist = userRepository.findSpecialistByEmail(email.trim().toLowerCase());
  if (!specialist) {
    throw new LinkError(404, 'No registered specialist with this email');
  }
  if (linkRepository.exists(childId, specialist.id)) {
    throw new LinkError(409, 'This specialist is already linked to the child');
  }

  const id = linkRepository.create(childId, specialist.id, type);
  return {
    id,
    specialist_id: specialist.id,
    name: specialist.name,
    email: specialist.email,
    specialist_type: type,
  };
}


function listSpecialists(childId) {
  return linkRepository.listForChild(childId);
}


function unlinkSpecialist(childId, specialistId) {
  if (!Number.isInteger(specialistId) || !linkRepository.remove(childId, specialistId)) {
    throw new LinkError(404, 'This specialist is not linked to the child');
  }
}


function listChildren(user) {
  switch (user && user.role) {
    case 'parent':
      return childRepository.listByParent(user.id);
    case 'specialist':
      return childRepository.listForSpecialist(user.id);
    case 'child': {
      const own = childRepository.findByUserId(user.id);
      return own ? [own] : [];
    }
    default:
      throw new LinkError(403, 'Forbidden');
  }
}

module.exports = {
  LinkError,
  SPECIALIST_TYPES,
  linkSpecialist,
  listSpecialists,
  unlinkSpecialist,
  listChildren,
};