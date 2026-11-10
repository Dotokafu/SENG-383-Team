import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

// Loads the tasks of one child (GET /api/children/:childId/tasks).
// Change `refreshKey` to load the list again, for example after a task was added.
export function useTasks(childId, refreshKey = 0) {
  const [result, setResult] = useState({ childId: null, refreshKey: null, tasks: [], error: null })

  useEffect(() => {
    if (childId === null) return undefined
    let active = true
    apiFetch(`/api/children/${childId}/tasks`)
      .then((data) => {
        if (active) setResult({ childId, refreshKey, tasks: data.tasks, error: null })
      })
      .catch((err) => {
        if (active) setResult({ childId, refreshKey, tasks: [], error: err.message })
      })
    return () => {
      active = false
    }
  }, [childId, refreshKey])

  const isCurrent = result.childId === childId
  return {
    // Tasks of another child are never shown, a refresh keeps the old list until the new one arrives.
    tasks: isCurrent ? result.tasks : [],
    error: isCurrent ? result.error : null,
    loading: childId !== null && (!isCurrent || result.refreshKey !== refreshKey),
  }
}