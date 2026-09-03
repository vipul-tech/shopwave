import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { cartApi, orderApi } from '../services/api'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], subtotal: 0, totalItems: 0 })
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm()

  const fetchCart = async () => {
    try {
      const res = await cartApi.getCart()
      setCart(res.data)
    } catch { toast.error('Failed to load cart') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCart() }, [])

  const removeItem = async (productId) => {
    try {
      await cartApi.removeItem(productId)
      toast.success('Item removed')
      fetchCart()
    } catch { toast.error('Failed to remove item') }
  }

  const onPlaceOrder = async ({ shippingAddress, notes }) => {
    setCheckingOut(true)
    try {
      const res = await orderApi.placeOrder({ shippingAddress, notes })
      toast.success(`Order ${res.data.orderNumber} placed!`)
      navigate(`/orders/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Order failed — please try again')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  if (cart.items.length === 0) return (
    <div className="text-center py-24">
      <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p className="text-xl font-semibold text-gray-400 mb-2">Your cart is empty</p>
      <Link to="/products" className="text-indigo-600 hover:underline text-sm font-medium">
        Continue Shopping →
      </Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Shopping Cart <span className="text-gray-400 font-normal text-lg">({cart.totalItems} items)</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map(item => (
            <div key={item.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{item.productName}</p>
                <p className="text-xs text-gray-400 font-mono">{item.productSku}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">${parseFloat(item.totalPrice).toFixed(2)}</p>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary + Checkout */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
            <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${parseFloat(cart.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>${parseFloat(cart.subtotal).toFixed(2)}</span>
              </div>
            </div>

            {!showCheckout ? (
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full mt-5 bg-indigo-600 text-white py-3 rounded-lg font-semibold
                           hover:bg-indigo-700 transition-colors"
              >
                Proceed to Checkout
              </button>
            ) : (
              <form onSubmit={handleSubmit(onPlaceOrder)} className="mt-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Shipping Address *
                  </label>
                  <textarea
                    {...register('shippingAddress', { required: 'Address is required' })}
                    rows={3}
                    placeholder="123 Main St, City, State, ZIP"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                  {errors.shippingAddress && (
                    <p className="text-xs text-red-500 mt-1">{errors.shippingAddress.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    {...register('notes')}
                    placeholder="Special delivery instructions..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingOut}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold
                             hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {checkingOut && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                  {checkingOut ? 'Placing Order...' : 'Place Order'}
                </button>
                <button type="button" onClick={() => setShowCheckout(false)}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
