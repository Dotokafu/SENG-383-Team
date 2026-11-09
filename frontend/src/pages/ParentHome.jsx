import { useAuth } from '../auth/authContext'

export default function ParentHome() {
  const { user } = useAuth()

  return (
    <section>
      <h2>Parent dashboard</h2>
      <p>Welcome, {user.name}.</p>
    </section>
  )
}