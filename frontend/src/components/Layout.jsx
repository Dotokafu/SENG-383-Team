import { useAuth } from '../auth/authContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div style={{ padding: 24 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <strong>StepTrack</strong>
        <span>
          {user.name} ({user.role}){' '}
          <button type="button" onClick={logout}>
            Log out
          </button>
        </span>
      </header>
      <main>{children}</main>
    </div>
  )
}