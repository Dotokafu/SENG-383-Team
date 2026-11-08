const taskRepository = require('../repositories/taskRepository');
const { HttpError } = require('../errors');


const AREAS = ['language', 'motor', 'social', 'emotional', 'cognitive', 'self_care'];


function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}


function addSixDays(monday) {
  const date = new Date(`${monday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}


function toTask(row) {
  return {
    id: row.id,
    childId: row.child_id,
    title: row.title,
    description: row.description,
    area: row.area,
    dueDate: row.due_date,
    status: row.status,
    doneAt: row.done_at,
    assignedBy: { id: row.assigned_by, name: row.assigned_by_name },
  };
}


function listTasks(childId, week) {
  if (week === undefined) {
    return taskRepository.findByChild(childId).map(toTask);
  }
  if (!isValidDate(week)) {
    throw new HttpError(400, 'week must be a date written as YYYY-MM-DD', 'week');
  }
  return taskRepository.findByChild(childId, week, addSixDays(week)).map(toTask);
}


function createTask(childId, assignerId, input) {
  const { title, description, area, dueDate } = input || {};

  if (typeof title !== 'string' || title.trim() === '') {
    throw new HttpError(400, 'Title is required', 'title');
  }
  if (!AREAS.includes(area)) {
    throw new HttpError(400, `Development area must be one of: ${AREAS.join(', ')}`, 'area');
  }
  if (!isValidDate(dueDate)) {
    throw new HttpError(400, 'Due date is required and must be written as YYYY-MM-DD', 'dueDate');
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new HttpError(400, 'Description must be text', 'description');
  }

  const row = taskRepository.create({
    childId,
    assignedBy: assignerId,
    title: title.trim(),
    description: description ? description.trim() : null,
    area,
    dueDate,
  });
  return toTask(row);
}


function markTaskDone(childId, taskId) {
  if (!Number.isInteger(taskId)) {
    throw new HttpError(400, 'Invalid task id');
  }

  const task = taskRepository.findById(taskId);
  
  if (!task || task.child_id !== childId) {
    throw new HttpError(404, 'Task not found');
  }
  if (task.status === 'done') {
    return toTask(task);
  }
  return toTask(taskRepository.markDone(taskId));
}

module.exports = { AREAS, listTasks, createTask, markTaskDone };