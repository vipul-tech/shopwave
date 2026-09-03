// import { Link, useNavigate } from 'react-router-dom'
// import { useAuth } from '../context/AuthContext'
// import { cartApi } from '../services/api'
// import { useEffect, useState } from 'react'
// import toast from 'react-hot-toast'

// export default function Navbar() {
//   const { user, logout, isAdmin } = useAuth()
//   const navigate = useNavigate()
//   const [cartCount, setCartCount] = useState(0)

//   useEffect(() => {
//     if (user) {
//       cartApi.getCart()
//         .then(res => setCartCount(res.data.totalItems || 0))
//         .catch(() => {})
//     }
//   }, [user])

//   const handleLogout = () => {
//     logout()
//     toast.success('Logged out')
//     navigate('/')
//   }

//   return (
//     <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
//       <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
//         {/* Logo */}
//         <Link to="/" className="font-bold text-2xl text-indigo-600">
//           ShopWave
//         </Link>

//         {/* Nav links */}
//         <div className="hidden md:flex items-center gap-6">
//           <Link to="/products" className="text-gray-600 hover:text-indigo-600 text-sm font-medium transition-colors">
//             Products
//           </Link>
//           {user && (
//             <Link to="/orders" className="text-gray-600 hover:text-indigo-600 text-sm font-medium transition-colors">
//               My Orders
//             </Link>
//           )}
//           {isAdmin && (
//             <span className="text-xs font-mono px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
//               ADMIN
//             </span>
//           )}
//         </div>

//         {/* Right side */}
//         <div className="flex items-center gap-3">
//           {user ? (
//             <>
//               {/* Cart */}
//               <Link to="/cart" className="relative p-2 text-gray-600 hover:text-indigo-600">
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                     d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
//                 </svg>
//                 {cartCount > 0 && (
//                   <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
//                     {cartCount}
//                   </span>
//                 )}
//               </Link>

//               {/* Profile dropdown */}
//               <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 font-medium">
//                 <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
//                   {user.firstName?.[0]?.toUpperCase()}
//                 </div>
//                 <span className="hidden md:inline">{user.firstName}</span>
//               </Link>

//               <button
//                 onClick={handleLogout}
//                 className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
//               >
//                 Logout
//               </button>
//             </>
//           ) : (
//             <>
//               <Link to="/login"
//                 className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors">
//                 Login
//               </Link>
//               <Link to="/register"
//                 className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
//                 Sign Up
//               </Link>
//             </>
//           )}
//         </div>
//       </div>
//     </nav>
//   )
// }

import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cartApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (user && !isAdmin) {
      cartApi.getCart()
        .then(res => setCartCount(res.data.totalItems || 0))
        .catch(() => {})
    }
  }, [user, isAdmin])

  useEffect(() => setMenuOpen(false), [location])

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="font-bold text-2xl text-indigo-600">ShopWave</Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/products"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
            Products
          </NavLink>

          {user && !isAdmin && (
            <NavLink to="/orders"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
              My Orders
            </NavLink>
          )}

          {/* Admin link — only shown for ADMIN role */}
          {isAdmin && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
              Admin Dashboard
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Cart — hidden for admins */}
              {!isAdmin && (
                <Link to="/cart" className="relative p-2 text-gray-600 hover:text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Admin badge */}
              {isAdmin && (
                <Link to="/admin"
                  className="text-xs font-bold px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 hover:bg-indigo-200 transition-colors">
                  ADMIN
                </Link>
              )}

              {/* Profile */}
              <Link to="/profile"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 font-medium">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {user.firstName?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:inline">{user.firstName}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login"
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Login
              </Link>
              <Link to="/register"
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(m => !m)}
            className="md:hidden text-gray-500 hover:text-indigo-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-3">
          <Link to="/products" className="block text-sm font-medium text-gray-700">Products</Link>
          {user && !isAdmin && <Link to="/orders" className="block text-sm font-medium text-gray-700">My Orders</Link>}
          {isAdmin && <Link to="/admin" className="block text-sm font-medium text-indigo-600">Admin Dashboard</Link>}
          {user && <Link to="/profile" className="block text-sm font-medium text-gray-700">Profile</Link>}
          {user && (
            <button onClick={handleLogout} className="block text-sm font-medium text-red-500">Logout</button>
          )}
        </div>
      )}
    </nav>
  )
}
