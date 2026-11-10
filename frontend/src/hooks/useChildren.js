import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

// Loads the children the logged-in user may work with (GET /api/children).
export function useChildren() {
  const [state, setState] = useState({ children: [], loading: true, error: null })

  useEffect(() => {
    let active = true
    apiFetch('/api/children')
      .then((data) => {
        if (active) setState({ children: data.children, loading: false, error: null })
      })
      .catch((err) => {
        if (active) setState({ children: [], loading: false, error: err.message })
      })
    return () => {
      active = false
    }
  }, [])

  return state
}