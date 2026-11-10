import { useState } from 'react'
import { areaLabel } from '../taskAreas'

// The tasks of a child with their status, shown to a parent or a linked specialist (FR-M4-04).
export default function TaskStatusList({ tasks, currentUserId, loading, error }) {
  const [onlyMine, setOnlyMine] = useState(false)
  const shown = onlyMine ? tasks.filter((task) => task.assignedBy.id === currentUserId) : tasks

  return (
    <div className="task-list">
      <h3>Tasks</h3>

      <label className="inline-label">
        <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
        Only tasks I assigned
      </label>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {loading && tasks.length === 0 && <p>Loading tasks...</p>}
      {!loading && !error && shown.length === 0 && <p>No tasks to show.</p>}

      {shown.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Area</th>
              <th>Due date</th>
              <th>Assigned by</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((task) => (
              <tr key={task.id} data-testid="task-row">
                <td>
                  {task.title}
                  {task.description && <div className="task-description">{task.description}</div>}
                </td>
                <td>{areaLabel(task.area)}</td>
                <td>{task.dueDate}</td>
                <td>{task.assignedBy.name}</td>
                <td>
                  <span className={`badge badge-${task.status}`}>
                    {task.status === 'done' ? 'Done' : 'Open'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}