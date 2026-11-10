const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireChildAccess } = require('../middleware/childAccess');
const linkService = require('../services/linkService');

const router = express.Router();

router.use(requireAuth);

// FR-M2-06: parent sees own children, specialist only linked ones, child their own record
router.get('/', (req, res) => {
  res.json({ children: linkService.listChildren(req.user) });
});

// Only the parent of the child may manage the specialist links.
const parentOfChild = [requireRole('parent'), requireChildAccess()];

// FR-M2-03
router.get('/:childId/specialists', ...parentOfChild, (req, res) => {
  res.json({ specialists: linkService.listSpecialists(req.childId) });
});

// FR-M2-01, FR-M2-02
router.post('/:childId/specialists', ...parentOfChild, (req, res) => {
  const { email, type } = req.body || {};
  const link = linkService.linkSpecialist(req.childId, email, type);
  res.status(201).json(link);
});

// FR-M2-04
router.delete('/:childId/specialists/:specialistId', ...parentOfChild, (req, res) => {
  linkService.unlinkSpecialist(req.childId, Number(req.params.specialistId));
  res.status(204).end();
});

module.exports = router;