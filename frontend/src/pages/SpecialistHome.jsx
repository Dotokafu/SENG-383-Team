import { useAuth } from '../auth/authContext'

export default function SpecialistHome() {
  const { user } = useAuth()

  return (
    <section>
      <h2>Your children</h2>
      <p>Welcome, {user.name}.</p>
    </section>
  )
}