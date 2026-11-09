import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { homePathFor } from '../auth/roles'
import Layout from './Layout'

// Lets only a logged-in user with an allowed role in (FR-M1-04).
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}