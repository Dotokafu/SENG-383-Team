import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/authContext'
import { homePathFor } from '../auth/roles'

function BackendStatus() {
  const [text, setText] = useState('Checking backend...')

  useEffect(() => {
    apiFetch('/api/health')
      .then((health) => setText(`Backend: ${health.status} / Database: ${health.database}`))
      .catch(() => setText('Backend is not reachable'))
  }, [])

  return <p style={{ marginTop: 24, fontSize: 14 }}>{text}</p>
}

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (user) return <Navigate to={homePathFor(user.role)} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const loggedIn = await login(email, password)
      navigate(homePathFor(loggedIn.role), { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '48px auto', padding: 24 }}>
      <h1>StepTrack</h1>
      <h2>Log in</h2>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              style={{ width: '100%' }}
            />
          </label>
        </p>
        <p>
          <label>
            Password
            <br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: '100%' }}
            />
          </label>
        </p>
        {error && (
          <p role="alert" style={{ color: 'crimson' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <BackendStatus />
    </div>
  )
}