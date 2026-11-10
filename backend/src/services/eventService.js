const eventRepository = require('../repositories/eventRepository');
const { HttpError } = require('../errors');
const { isValidDate, addSixDays, isValidTime } = require('../utils/dates');

function toEvent(row) {
  return {
    id: row.id,
    childId: row.child_id,
    title: row.title,
    date: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    createdBy: { id: row.created_by, name: row.created_by_name },
  };
}

// `week` is the Monday of the wanted week (YYYY-MM-DD); without it every event is returned.
function listEvents(childId, week) {
  if (week === undefined) {
    return eventRepository.findByChild(childId).map(toEvent);
  }
  if (!isValidDate(week)) {
    throw new HttpError(400, 'week must be a date written as YYYY-MM-DD', 'week');
  }
  return eventRepository.findByChild(childId, week, addSixDays(week)).map(toEvent);
}

function createEvent(childId, creatorId, input) {
  const { title, date, startTime, endTime } = input || {};

  // FR-M3-02: a missing title or date is rejected and the field is named.
  if (typeof title !== 'string' || title.trim() === '') {
    throw new HttpError(400, 'Title is required', 'title');
  }
  if (!isValidDate(date)) {
    throw new HttpError(400, 'Date is required and must be written as YYYY-MM-DD', 'date');
  }

  const hasStart = startTime !== undefined && startTime !== null;
  const hasEnd = endTime !== undefined && endTime !== null;

  if (hasStart && !isValidTime(startTime)) {
    throw new HttpError(400, 'Start time must be written as HH:MM', 'startTime');
  }
  if (hasEnd && !isValidTime(endTime)) {
    throw new HttpError(400, 'End time must be written as HH:MM', 'endTime');
  }
  if (hasEnd && !hasStart) {
    throw new HttpError(400, 'Start time is required when an end time is given', 'startTime');
  }
  // HH:MM strings compare correctly as text.
  if (hasStart && hasEnd && endTime <= startTime) {
    throw new HttpError(400, 'End time must be after the start time', 'endTime');
  }

  const row = eventRepository.create({
    childId,
    createdBy: creatorId,
    title: title.trim(),
    eventDate: date,
    startTime: hasStart ? startTime : null,
    endTime: hasEnd ? endTime : null,
  });
  return toEvent(row);
}

module.exports = { listEvents, createEvent };
