import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError('Backend is not reachable'))
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1>StepTrack</h1>
      {error && <p>{error}</p>}
      {!error && !health && <p>Checking backend...</p>}
      {health && (
        <p>
          Backend: {health.status} / Database: {health.database}
        </p>
      )}
    </div>
  )
}

export default App