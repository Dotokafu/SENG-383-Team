const express = require('express');
const taskService = require('../services/taskService');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireChildAccess } = require('../middleware/childAccess');
const { HttpError } = require('../errors');

const router = express.Router();


function handleError(err, res, next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.field) body.field = err.field;
    return res.status(err.status).json(body);
  }
  next(err);
}


router.get('/children/:childId/tasks', requireAuth, requireChildAccess(), (req, res, next) => {
  try {
    const tasks = taskService.listTasks(req.childId, req.query.week);
    res.json({ tasks });
  } catch (err) {
    handleError(err, res, next);
  }
});


router.post(
  '/children/:childId/tasks',
  requireAuth,
  requireRole('parent', 'specialist'),
  requireChildAccess(),
  (req, res, next) => {
    try {
      const task = taskService.createTask(req.childId, req.user.id, req.body);
      res.status(201).json({ task });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);


router.patch(
  '/children/:childId/tasks/:taskId/done',
  requireAuth,
  requireRole('child'),
  requireChildAccess(),
  (req, res, next) => {
    try {
      const task = taskService.markTaskDone(req.childId, Number(req.params.taskId));
      res.json({ task });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

module.exports = router;