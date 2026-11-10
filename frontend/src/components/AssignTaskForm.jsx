import { useState } from 'react'
import { apiFetch } from '../api'
import { AREAS } from '../taskAreas'

const EMPTY_FORM = { title: '', description: '', area: AREAS[0].value, dueDate: '' }

// The form a parent or a linked specialist uses to assign a task (FR-M4-01).
export default function AssignTaskForm({ childId, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function update(field) {
    return (event) => {
      setForm({ ...form, [field]: event.target.value })
      setSuccess(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await apiFetch(`/api/children/${childId}/tasks`, { method: 'POST', body: form })
      setForm(EMPTY_FORM)
      setSuccess(true)
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h3>Assign a task</h3>

      <div className="field">
        <label htmlFor="task-title">Title</label>
        <input id="task-title" type="text" value={form.title} onChange={update('title')} required />
      </div>

      <div className="field">
        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          rows={2}
          value={form.description}
          onChange={update('description')}
        />
      </div>

      <div className="field">
        <label htmlFor="task-area">Development area</label>
        <select id="task-area" value={form.area} onChange={update('area')}>
          {AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="task-due-date">Due date</label>
        <input
          id="task-due-date"
          type="date"
          value={form.dueDate}
          onChange={update('dueDate')}
          required
        />
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-success">
          Task assigned.
        </p>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Assigning...' : 'Assign task'}
      </button>
    </form>
  )
}