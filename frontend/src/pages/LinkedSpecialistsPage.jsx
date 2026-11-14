import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import LinkSpecialistForm from '../components/LinkSpecialistForm'
import { typeLabel } from '../specialistTypes'

export default function LinkedSpecialistsPage() {
  const [children, setChildren] = useState(null) // null while loading
  const [childrenError, setChildrenError] = useState(null)
  const [childId, setChildId] = useState(null)

  // reloadKey changes after a link or an unlink, so the list is loaded again.
  const [reloadKey, setReloadKey] = useState(0)
  const [loaded, setLoaded] = useState({ key: null, specialists: [], error: null })

  const [notice, setNotice] = useState(null)
  const [toRemove, setToRemove] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState(null)

  const requestKey = `${childId}:${reloadKey}`
  const loading = loaded.key !== requestKey
  const child = children ? children.find((item) => item.id === childId) : null

  // The children of this parent (GET /api/children).
  useEffect(() => {
    apiFetch('/api/children')
      .then((data) => {
        setChildren(data.children)
        setChildId(data.children.length > 0 ? data.children[0].id : null)
      })
      .catch((err) => setChildrenError(err.message))
  }, [])

  // The specialists linked to the selected child (FR-M2-03).
  useEffect(() => {
    if (childId === null) return undefined
    let cancelled = false

    apiFetch(`/api/children/${childId}/specialists`)
      .then((data) => {
        if (!cancelled) setLoaded({ key: requestKey, specialists: data.specialists, error: null })
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key: requestKey, specialists: [], error: err.message })
      })

    return () => {
      cancelled = true
    }
  }, [childId, requestKey])

  function handleLinked(link) {
    setNotice(`${link.name} was linked to ${child.name}.`)
    setReloadKey((key) => key + 1)
  }

  // Called after the parent confirmed in the dialog (FR-M2-04).
  async function confirmRemove() {
    setRemoving(true)
    setRemoveError(null)
    try {
      await apiFetch(`/api/children/${childId}/specialists/${toRemove.specialist_id}`, {
        method: 'DELETE',
      })
      setNotice(`${toRemove.name} was unlinked from ${child.name}.`)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setRemoveError(err.message)
    } finally {
      setToRemove(null)
      setRemoving(false)
    }
  }

  function handleChildChange(event) {
    setChildId(Number(event.target.value))
    setNotice(null)
    setRemoveError(null)
  }

  if (childrenError) {
    return <p role="alert">{childrenError}</p>
  }
  if (children === null) {
    return <p>Loading...</p>
  }
  if (children.length === 0) {
    return <p>There is no child on your account yet.</p>
  }

  return (
    <section>
      <p>
        <Link to="/parent">Back to dashboard</Link>
      </p>
      <h2>Linked specialists</h2>

      {children.length > 1 && (
        <p>
          <label>
            Child{' '}
            <select value={childId} onChange={handleChildChange}>
              {children.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </p>
      )}

      <p>
        These specialists can see and work with the data of <strong>{child.name}</strong>. After you
        unlink a specialist, they lose access at once.
      </p>

      {notice && <p role="status">{notice}</p>}
      {removeError && (
        <p role="alert" style={{ color: 'crimson' }}>
          {removeError}
        </p>
      )}

      {loading && <p>Loading specialists...</p>}
      {!loading && loaded.error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {loaded.error}
        </p>
      )}
      {!loading && !loaded.error && loaded.specialists.length === 0 && (
        <p>No specialist is linked to {child.name} yet.</p>
      )}
      {!loading && loaded.specialists.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Linked on</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {loaded.specialists.map((specialist) => (
                <tr key={specialist.id}>
                  <td style={{ padding: 8 }}>{specialist.name}</td>
                  <td style={{ padding: 8 }}>{specialist.email}</td>
                  <td style={{ padding: 8 }}>{typeLabel(specialist.specialist_type)}</td>
                  <td style={{ padding: 8 }}>{specialist.created_at.slice(0, 10)}</td>
                  <td style={{ padding: 8 }}>
                    <button type="button" onClick={() => setToRemove(specialist)}>
                      Unlink
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LinkSpecialistForm key={childId} childId={childId} onLinked={handleLinked} />

      {toRemove && (
        <ConfirmDialog
          title="Unlink specialist?"
          message={`${toRemove.name} will lose access to the data of ${child.name} at once. You can link them again later.`}
          confirmLabel="Unlink"
          busy={removing}
          onConfirm={confirmRemove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </section>
  )
}