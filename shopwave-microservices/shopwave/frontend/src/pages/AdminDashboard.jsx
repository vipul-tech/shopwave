import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminOrderApi, adminUserApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  PENDING:   { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  CONFIRMED: { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'   },
  SHIPPED:   { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  DELIVERED: { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200'  },
  CANCELLED: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-200'    },
}

// Valid next transitions for each status
const NEXT_STATUSES = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED',   'CANCELLED'],
  SHIPPED:   ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
      {status}
    </span>
  )
}

function StatusUpdateModal({ order, onClose, onUpdated }) {
  const [updating, setUpdating] = useState(false)
  const nextOptions = NEXT_STATUSES[order.status] || []

  const handleUpdate = async (newStatus) => {
    setUpdating(true)
    try {
      await adminOrderApi.updateStatus(order.id, newStatus)
      toast.success(`Order ${order.orderNumber} → ${newStatus}`)
      onUpdated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Update Order Status</h2>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Order summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer email</span>
            <span className="text-gray-800 font-medium">{order.userEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total amount</span>
            <span className="text-gray-800 font-bold">${parseFloat(order.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Items</span>
            <span className="text-gray-800">{order.items?.length || 0} item(s)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Current status</span>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Items list */}
        {order.items && order.items.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">ORDER ITEMS</p>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                  <span className="text-gray-800 font-medium">${parseFloat(item.totalPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping address */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-1">SHIP TO</p>
          <p className="text-sm text-gray-700">{order.shippingAddress}</p>
        </div>

        {/* Status action buttons */}
        {nextOptions.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Move order to:</p>
            <div className="flex flex-wrap gap-3">
              {nextOptions.map(status => {
                const colors = STATUS_COLORS[status]
                return (
                  <button
                    key={status}
                    onClick={() => handleUpdate(status)}
                    disabled={updating}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border transition-all
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`}
                  >
                    {updating ? 'Updating...' : `→ ${status}`}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-3 bg-gray-50 rounded-xl text-sm text-gray-500">
            This order is in a final state — no further updates possible.
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchEmail, setSearchEmail] = useState('')

  // Redirect if not admin
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!isAdmin) { navigate('/'); toast.error('Admin access required'); return }
  }, [user, isAdmin, navigate])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: 15 }
      if (filterStatus) params.status = filterStatus
      const res = await adminOrderApi.getAllOrders(params)
      setOrders(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
      setTotalElements(res.data.totalElements || 0)
    } catch (err) {
      toast.error('Failed to load orders. Make sure Order Service is running on port 8083.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminUserApi.getAllUsers()
      setUsers(res.data || [])
    } catch (err) {
      toast.error('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'users')  fetchUsers()
  }, [activeTab, fetchOrders, fetchUsers])

  const handleOrderUpdated = () => fetchOrders()

  const filteredUsers = searchEmail
    ? users.filter(u => u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
                        u.firstName?.toLowerCase().includes(searchEmail.toLowerCase()))
    : users

  const stats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    shipped:   orders.filter(o => o.status === 'SHIPPED').length,
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Logged in as {user?.email}</p>
        </div>
        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
          ADMIN
        </span>
      </div>

      {/* Stat cards — only shown on orders tab */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total orders',  value: totalElements, color: 'bg-gray-50  border-gray-200',   text: 'text-gray-800'   },
            { label: 'Pending',       value: stats.pending,   color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
            { label: 'Confirmed',     value: stats.confirmed, color: 'bg-blue-50   border-blue-200',   text: 'text-blue-700'   },
            { label: 'Shipped',       value: stats.shipped,   color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {['orders', 'users'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(0) }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'orders' ? `All Orders` : `All Users`}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-600">Filter by status:</span>
            {['', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(0) }}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                  filterStatus === s
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm mt-1">
                {filterStatus ? `No orders with status "${filterStatus}"` : 'No orders placed yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Orders table */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Order No.</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map(order => {
                        const canUpdate = NEXT_STATUSES[order.status]?.length > 0
                        return (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-600">{order.orderNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-800 text-xs">{order.userEmail}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-600">{order.items?.length || 0} item(s)</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-900">
                                ${parseFloat(order.totalAmount).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-500 text-xs">
                                {order.createdAt
                                  ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                      day: '2-digit', month: 'short', year: 'numeric'
                                    })
                                  : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                  canUpdate
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!canUpdate}
                              >
                                {canUpdate ? 'Update Status' : 'Final'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── USERS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            u.role === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No users found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {selectedOrder && (
        <StatusUpdateModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={handleOrderUpdated}
        />
      )}
    </div>
  )
}
