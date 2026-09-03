// import { Routes, Route, Navigate } from 'react-router-dom'
// import { AuthProvider, useAuth } from './context/AuthContext'
// import { Toaster } from 'react-hot-toast'
// import Navbar from './components/Navbar'
// import ProductsPage from './pages/ProductsPage'
// import ProductDetailPage from './pages/ProductDetailPage'
// import CartPage from './pages/CartPage'
// import OrdersPage from './pages/OrdersPage'
// import OrderDetailPage from './pages/OrderDetailPage'
// import LoginPage from './pages/LoginPage'
// import RegisterPage from './pages/RegisterPage'
// import ProfilePage from './pages/ProfilePage'

// function ProtectedRoute({ children }) {
//   const { user } = useAuth()
//   return user ? children : <Navigate to="/login" replace />
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <div className="min-h-screen bg-gray-50">
//         <Navbar />
//         <main className="max-w-7xl mx-auto px-4 py-8">
//           <Routes>
//             <Route path="/"               element={<ProductsPage />} />
//             <Route path="/products"       element={<ProductsPage />} />
//             <Route path="/products/:id"   element={<ProductDetailPage />} />
//             <Route path="/login"          element={<LoginPage />} />
//             <Route path="/register"       element={<RegisterPage />} />
//             <Route path="/cart"           element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
//             <Route path="/orders"         element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
//             <Route path="/orders/:id"     element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
//             <Route path="/profile"        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
//             <Route path="*"               element={<Navigate to="/" replace />} />
//           </Routes>
//         </main>
//       </div>
//       <Toaster position="bottom-right" />
//     </AuthProvider>
//   )
// }

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/AdminDashboard'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/"             element={<ProductsPage />} />
            <Route path="/products"     element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/login"        element={<LoginPage />} />
            <Route path="/register"     element={<RegisterPage />} />
            <Route path="/cart"         element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/orders"       element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id"   element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/profile"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin"        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </AuthProvider>
  )
}
