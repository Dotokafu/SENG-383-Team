import { useAuth } from '../auth/authContext'
import ChildTasksPanel from '../components/ChildTasksPanel'

export default function SpecialistHome() {
  const { user } = useAuth()

  return (
    <section>
      <h2>Your children</h2>
      <p>Welcome, {user.name}.</p>
      <ChildTasksPanel />
    </section>
  )
}