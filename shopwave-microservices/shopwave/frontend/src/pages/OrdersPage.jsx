import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { orderApi } from '../services/api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED:   'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-500',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    orderApi.getOrders({ page, size: 10 })
      .then(res => {
        setOrders(res.data.content || [])
        setTotalPages(res.data.totalPages || 0)
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [page])

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg font-medium">No orders yet</p>
          <Link to="/products" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
            Start Shopping →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-gray-500">{order.orderNumber}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                  <p className="font-bold text-gray-900 text-lg mt-2">
                    ${parseFloat(order.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            ← Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
