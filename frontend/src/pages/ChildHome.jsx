import { useAuth } from '../auth/authContext'

export default function ChildHome() {
  const { user } = useAuth()

  return (
    <section>
      <h2>My tasks</h2>
      <p>Hello, {user.name}.</p>
    </section>
  )
}