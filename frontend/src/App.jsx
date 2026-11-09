import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { homePathFor } from './auth/roles'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import ParentHome from './pages/ParentHome'
import SpecialistHome from './pages/SpecialistHome'
import ChildHome from './pages/ChildHome'

function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/parent" element={<ProtectedRoute roles={['parent']} />}>
        <Route index element={<ParentHome />} />
      </Route>
      <Route path="/specialist" element={<ProtectedRoute roles={['specialist']} />}>
        <Route index element={<SpecialistHome />} />
      </Route>
      <Route path="/child" element={<ProtectedRoute roles={['child']} />}>
        <Route index element={<ChildHome />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}