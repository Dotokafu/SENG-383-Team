import { useState } from 'react'
import { useAuth } from '../auth/authContext'
import { useChildren } from '../hooks/useChildren'
import { useTasks } from '../hooks/useTasks'
import AssignTaskForm from './AssignTaskForm'
import TaskStatusList from './TaskStatusList'
import WeeklyCalendar from './WeeklyCalendar'
import './tasks.css'

// Used on the parent dashboard and on the specialist page: choose a child,
// assign a task to them and follow the status of their tasks.
export default function ChildTasksPanel() {
  const { user } = useAuth()
  const { children, loading, error } = useChildren()
  const [selectedId, setSelectedId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Until a child is chosen, the first one is used.
  const childId = selectedId ?? (children.length > 0 ? children[0].id : null)
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks(childId, refreshKey)

  if (loading) return <p>Loading...</p>
  if (error) {
    return (
      <p role="alert" className="form-error">
        {error}
      </p>
    )
  }
  if (children.length === 0) return <p>No children are linked to your account yet.</p>

  return (
    <div className="tasks-panel">
      {children.length > 1 ? (
        <div className="child-select">
          <label htmlFor="child-select">Child</label>
          <select
            id="child-select"
            value={childId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <h3>{children[0].name}</h3>
      )}

      <AssignTaskForm childId={childId} onCreated={() => setRefreshKey((key) => key + 1)} />
      <WeeklyCalendar childId={childId} />
      <TaskStatusList
        tasks={tasks}
        currentUserId={user.id}
        loading={tasksLoading}
        error={tasksError}
      />
    </div>
  )
}