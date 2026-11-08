const { canAccessChild } = require('../services/accessService');

// Use after requireAuth, on routes like /api/children/:childId/...
// Usage: router.get('/children/:childId/events', requireAuth, requireChildAccess(), handler)
function requireChildAccess(paramName = 'childId') {
  return (req, res, next) => {
    const childId = Number(req.params[paramName]);

    if (!Number.isInteger(childId)) {
      return res.status(400).json({ error: 'Invalid child id' });
    }
    if (!canAccessChild(req.user, childId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.childId = childId;
    next();
  };
}

module.exports = { requireChildAccess };