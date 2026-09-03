import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { orderApi } from '../services/api'
import toast from 'react-hot-toast'

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']

const STATUS_COLORS = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED:   'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-500',
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    orderApi.getById(id)
      .then(res => setOrder(res.data))
      .catch(() => toast.error('Order not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      await orderApi.cancel(id)
      toast.success('Order cancelled')
      navigate('/orders')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot cancel this order')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
  if (!order) return null

  const stepIndex = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/orders" className="text-gray-400 hover:text-gray-600">← Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm text-gray-600">{order.orderNumber}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-400 mt-1 font-mono">{order.orderNumber}</p>
            <p className="text-xs text-gray-400">
              Placed {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
            {order.status}
          </span>
        </div>

        {/* Progress tracker (only for non-cancelled orders) */}
        {order.status !== 'CANCELLED' && (
          <div className="mb-6">
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i <= stepIndex ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded ${i < stepIndex ? 'bg-indigo-600' : 'bg-gray-100'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {STATUS_STEPS.map(step => (
                <span key={step} className="text-xs text-gray-400 capitalize">
                  {step.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Shipping address */}
        <div className="bg-gray-50 rounded-lg p-3 mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-1">SHIP TO</p>
          <p className="text-sm text-gray-700">{order.shippingAddress}</p>
          {order.notes && <p className="text-xs text-gray-400 mt-1 italic">Note: {order.notes}</p>}
        </div>

        {/* Items */}
        <div className="space-y-3 mb-5">
          <p className="text-sm font-semibold text-gray-600">Items</p>
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-t border-gray-50">
              <div>
                <p className="font-medium text-gray-800 text-sm">{item.productName}</p>
                <p className="text-xs text-gray-400 font-mono">{item.productSku}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}</p>
              </div>
              <p className="font-semibold text-gray-800">${parseFloat(item.totalPrice).toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <span className="font-semibold text-gray-800">Total</span>
          <span className="text-2xl font-bold text-gray-900">
            ${parseFloat(order.totalAmount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-semibold
                     hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {cancelling ? 'Cancelling...' : 'Cancel Order'}
        </button>
      )}
    </div>
  )
}
