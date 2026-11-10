const express = require('express');
const eventService = require('../services/eventService');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireChildAccess } = require('../middleware/childAccess');
const { HttpError } = require('../errors');

const router = express.Router();

// Same error format as the task routes: { error, field? }.
function handleError(err, res, next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.field) body.field = err.field;
    return res.status(err.status).json(body);
  }
  next(err);
}

// Parent, linked specialist and the child itself may read the schedule (FR-M3-03, FR-M3-04).
router.get('/children/:childId/events', requireAuth, requireChildAccess(), (req, res, next) => {
  try {
    const events = eventService.listEvents(req.childId, req.query.week);
    res.json({ events });
  } catch (err) {
    handleError(err, res, next);
  }
});

// Only a parent or a linked specialist may add events (FR-M3-01).
router.post(
  '/children/:childId/events',
  requireAuth,
  requireRole('parent', 'specialist'),
  requireChildAccess(),
  (req, res, next) => {
    try {
      const event = eventService.createEvent(req.childId, req.user.id, req.body);
      res.status(201).json({ event });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

module.exports = router;
