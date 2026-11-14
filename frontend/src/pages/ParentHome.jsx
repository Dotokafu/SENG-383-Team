import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import ChildTasksPanel from '../components/ChildTasksPanel'

export default function ParentHome() {
  const { user } = useAuth()

  return (
    <section>
      <h2>Parent dashboard</h2>
      <p>Welcome, {user.name}.</p>
      <p>
        <Link to="/parent/specialists">Manage linked specialists</Link>
      </p>
      <ChildTasksPanel />
    </section>
  )
}