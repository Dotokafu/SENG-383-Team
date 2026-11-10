// Date helpers shared by the schedule code. Dates are plain YYYY-MM-DD strings (UTC, no time zone).

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// The last day of a Monday-to-Sunday week that starts on `monday`.
function addSixDays(monday) {
  const date = new Date(`${monday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

// HH:MM, 24-hour clock.
function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

module.exports = { isValidDate, addSixDays, isValidTime };
