import { useAuth } from '../auth/authContext'
import ChildEventList from '../components/ChildEventList'

export default function ChildHome() {
  const { user } = useAuth()

  return (
    <section>
      <h2>My tasks</h2>
      <p>Hello, {user.name}.</p>
      <ChildEventList />
    </section>
  )
}