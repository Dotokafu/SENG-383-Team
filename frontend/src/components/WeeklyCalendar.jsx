import { useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import AddEventModal from './AddEventModal'
import './events.css'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function shiftWeek(mondayStr, days) {
  const d = new Date(`${mondayStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function getWeekDays(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${mondayStr}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return {
      name: DAY_NAMES[i],
      dateStr: d.toISOString().slice(0, 10),
      dayNum: d.getUTCDate(),
    }
  })
}

export default function WeeklyCalendar({ childId, canAddEvent = true }) {
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()))
  const [refreshKey, setRefreshKey] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDateForModal, setSelectedDateForModal] = useState('')

  const { events, loading, error } = useEvents(childId, currentMonday, refreshKey)

  const weekDays = getWeekDays(currentMonday)

  function handleOpenModal(dateStr = '') {
    setSelectedDateForModal(dateStr || currentMonday)
    setIsModalOpen(true)
  }

  return (
    <div className="weekly-calendar-card">
      <div className="calendar-header">
        <div className="week-navigation">
          <h3>Schedule</h3>
          <button
            type="button"
            className="btn-nav"
            onClick={() => setCurrentMonday((prev) => shiftWeek(prev, -7))}
          >
            &larr; Prev
          </button>
          <button
            type="button"
            className="btn-nav"
            onClick={() => setCurrentMonday(getMonday(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-nav"
            onClick={() => setCurrentMonday((prev) => shiftWeek(prev, 7))}
          >
            Next &rarr;
          </button>
          <span className="week-label">Week of {currentMonday}</span>
          {loading && <span className="loading-badge">loading...</span>}
        </div>

        {canAddEvent && (
          <button
            type="button"
            className="add-event-btn"
            onClick={() => handleOpenModal()}
          >
            Add event
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {/* Grid her zaman yerinde sabit kalır, boyut asla oynamaz */}
      <div className={`calendar-grid ${loading ? 'grid-loading' : ''}`}>
        {weekDays.map((day) => {
          const dayEvents = events.filter((e) => e.date === day.dateStr)
          return (
            <div key={day.dateStr} className="calendar-day-column">
              <div className="day-header">
                <span className="day-name">{day.name}</span>
                <span className="day-number">{day.dayNum}</span>
              </div>
              <div className="day-events">
                {dayEvents.length === 0 ? (
                  <span className="no-events">-</span>
                ) : (
                  dayEvents.map((evt) => (
                    <div key={evt.id} className="event-card">
                      <span className="event-title">{evt.title}</span>
                      {evt.startTime && (
                        <span className="event-time">
                          {evt.startTime}
                          {evt.endTime ? ` - ${evt.endTime}` : ''}
                        </span>
                      )}
                      <span className="event-by">{evt.createdBy.name}</span>
                    </div>
                  ))
                )}
              </div>
              {canAddEvent && (
                <button
                  type="button"
                  className="add-day-btn"
                  title={`Add event on ${day.dateStr}`}
                  onClick={() => handleOpenModal(day.dateStr)}
                >
                  +
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isModalOpen && (
        <AddEventModal
          childId={childId}
          defaultDate={selectedDateForModal}
          onClose={() => setIsModalOpen(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
