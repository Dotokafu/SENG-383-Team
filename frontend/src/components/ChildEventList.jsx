import { useState } from 'react'
import { useChildren } from '../hooks/useChildren'
import { useEvents } from '../hooks/useEvents'
import './events.css'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getTodayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatEventDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dayName = DAY_NAMES[dateObj.getDay()]
  return `${dayName}, ${dateStr}`
}

function formatEventTime(startTime, endTime) {
  if (!startTime) return 'All day'
  return endTime ? `${startTime} – ${endTime}` : startTime
}

// Read-only upcoming schedule view for a child account (FR-M3-02, FR-M3-04).
export default function ChildEventList() {
  const { children, loading: childrenLoading, error: childrenError } = useChildren()
  const [showPast, setShowPast] = useState(false)

  const childId = children.length > 0 ? children[0].id : null
  const { events, loading: eventsLoading, error: eventsError } = useEvents(childId)

  if (childrenLoading) return <p>Loading schedule...</p>
  if (childrenError) {
    return (
      <p role="alert" className="form-error">
        {childrenError}
      </p>
    )
  }
  if (children.length === 0) return <p>No child profile linked to this account.</p>

  const today = getTodayString()
  const visibleEvents = showPast ? events : events.filter((ev) => ev.date >= today)

  return (
    <div className="child-events-panel">
      <div className="child-events-header">
        <h3>Upcoming Events</h3>
        <label className="inline-label">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => setShowPast(e.target.checked)}
          />
          Show past events
        </label>
      </div>

      {eventsError && (
        <p role="alert" className="form-error">
          {eventsError}
        </p>
      )}
      {eventsLoading && events.length === 0 && <p>Loading events...</p>}
      {!eventsLoading && !eventsError && visibleEvents.length === 0 && (
        <p className="no-upcoming-events">No upcoming events scheduled.</p>
      )}

      {visibleEvents.length > 0 && (
        <div className="child-event-list">
          {visibleEvents.map((ev) => (
            <div key={ev.id} className="child-event-row" data-testid="child-event-item">
              <div className="child-event-main">
                <span className="child-event-title">{ev.title}</span>
                {ev.createdBy?.name && (
                  <span className="child-event-by">Added by {ev.createdBy.name}</span>
                )}
              </div>
              <div className="child-event-meta">
                <span className="child-event-date">{formatEventDate(ev.date)}</span>
                <span className="child-event-time">
                  {formatEventTime(ev.startTime, ev.endTime)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
