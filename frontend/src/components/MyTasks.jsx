import { useState } from 'react'
import { apiFetch } from '../api'
import { useChildren } from '../hooks/useChildren'
import { useTasks } from '../hooks/useTasks'
import { areaLabel } from '../taskAreas'
import './tasks.css'

// The "My tasks" list of a child account: open tasks with a "Mark as done" button
// and the tasks that are already done (FR-M4-02, FR-M4-03).
export default function MyTasks() {
  const { children, loading, error } = useChildren()
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  // Tasks that were marked done in this session, so they move to "Done" at once.
  const [justDone, setJustDone] = useState([])
  const [actionError, setActionError] = useState(null)

  const childId = children.length > 0 ? children[0].id : null
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks(childId, refreshKey)

  async function markDone(task) {
    setBusyId(task.id)
    setActionError(null)
    try {
      await apiFetch(`/api/children/${childId}/tasks/${task.id}/done`, { method: 'PATCH' })
      setJustDone((ids) => [...ids, task.id])
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p>Loading tasks...</p>
  if (error) {
    return (
      <p role="alert" className="form-error">
        {error}
      </p>
    )
  }
  if (childId === null) return <p>No child profile is linked to your account.</p>

  const isDone = (task) => task.status === 'done' || justDone.includes(task.id)
  const todo = tasks.filter((task) => !isDone(task))
  const done = tasks.filter(isDone)

  return (
    <div className="child-tasks">
      {tasksError && (
        <p role="alert" className="form-error">
          {tasksError}
        </p>
      )}
      {actionError && (
        <p role="alert" className="form-error">
          {actionError}
        </p>
      )}
      {tasksLoading && tasks.length === 0 && <p>Loading tasks...</p>}

      <h3>To do</h3>
      {!tasksLoading && !tasksError && todo.length === 0 && <p>You have no open tasks.</p>}
      {todo.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Area</th>
              <th>Due date</th>
              <th>From</th>
              <th>
                <span className="visually-hidden">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {todo.map((task) => (
              <tr key={task.id} data-testid="todo-row">
                <td>
                  {task.title}
                  {task.description && <div className="task-description">{task.description}</div>}
                </td>
                <td>{areaLabel(task.area)}</td>
                <td>{task.dueDate}</td>
                <td>{task.assignedBy.name}</td>
                <td>
                  <button
                    type="button"
                    aria-label={`Mark as done: ${task.title}`}
                    disabled={busyId === task.id}
                    onClick={() => markDone(task)}
                  >
                    Mark as done
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Done</h3>
      {!tasksLoading && !tasksError && done.length === 0 && <p>No finished tasks yet.</p>}
      {done.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Area</th>
              <th>Due date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {done.map((task) => (
              <tr key={task.id} data-testid="done-row">
                <td>{task.title}</td>
                <td>{areaLabel(task.area)}</td>
                <td>{task.dueDate}</td>
                <td>
                  <span className="badge badge-done">Done</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
