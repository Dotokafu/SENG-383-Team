import { useState } from 'react'
import { apiFetch } from '../api'
import { SPECIALIST_TYPES } from '../specialistTypes'

export default function LinkSpecialistForm({ childId, onLinked }) {
  const [email, setEmail] = useState('')
  const [type, setType] = useState(SPECIALIST_TYPES[0].value)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const link = await apiFetch(`/api/children/${childId}/specialists`, {
        method: 'POST',
        body: { email, type },
      })
      setEmail('')
      onLinked(link)
    } catch (err) {
      // For example: "No registered specialist with this email" (FR-M2-02)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <h3>Link a specialist</h3>
      <p>
        <label>
          Specialist email
          <br />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ width: '100%', maxWidth: 320 }}
          />
        </label>
      </p>
      <p>
        <label>
          Type
          <br />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {SPECIALIST_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </p>
      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Linking...' : 'Link specialist'}
      </button>
    </form>
  )
}