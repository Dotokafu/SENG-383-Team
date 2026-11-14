import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

// Loads events of a child (GET /api/children/:childId/events, optionally filtered by ?week=YYYY-MM-DD).
// Change `refreshKey` to force re-fetch.
export function useEvents(childId, week = null, refreshKey = 0) {
  const [result, setResult] = useState({
    childId: null,
    week: null,
    refreshKey: null,
    events: [],
    error: null,
  })

  useEffect(() => {
    if (childId === null) return undefined
    let active = true
    const query = week ? `?week=${week}` : ''
    apiFetch(`/api/children/${childId}/events${query}`)
      .then((data) => {
        if (active) setResult({ childId, week, refreshKey, events: data.events, error: null })
      })
      .catch((err) => {
        if (active) setResult({ childId, week, refreshKey, events: [], error: err.message })
      })
    return () => {
      active = false
    }
  }, [childId, week, refreshKey])

  const isCurrent = result.childId === childId && result.week === week
  return {
    events: isCurrent ? result.events : [],
    error: isCurrent ? result.error : null,
    loading: childId !== null && (!isCurrent || result.refreshKey !== refreshKey),
  }
}
