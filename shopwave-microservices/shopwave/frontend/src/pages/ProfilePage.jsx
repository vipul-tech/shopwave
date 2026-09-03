import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { productApi, cartApi } from '../services/api'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function ProductDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    productApi.getById(id)
      .then(res => setProduct(res.data))
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false))
  }, [id])

  const addToCart = async () => {
    if (!user) { toast.error('Please login first'); return }
    setAdding(true)
    try {
      await cartApi.addItem({ productId: product.id, quantity: qty })
      toast.success(`${qty}× ${product.name} added to cart`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart')
    } finally { setAdding(false) }
  }

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
  if (!product) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 h-72 md:h-full flex items-center justify-center p-12">
            <svg className="w-32 h-32 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="p-8 flex flex-col justify-center">
            {product.category && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full self-start mb-3">
                {product.category}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-sm font-mono text-gray-400 mb-3">SKU: {product.sku}</p>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${product.inStock ? 'text-green-600' : 'text-red-500'}`}>
                {product.inStock ? `${product.stockQty} in stock` : 'Out of stock'}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-6">${parseFloat(product.price).toFixed(2)}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50">−</button>
                <span className="px-4 py-2 text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stockQty, q + 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50">+</button>
              </div>
              <button onClick={addToCart} disabled={!product.inStock || adding}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                {adding ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    authApi.profile().then(res => setProfile(res.data)).catch(() => {})
  }, [])

  const p = profile || user

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
            {p?.firstName?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{p?.firstName} {p?.lastName}</h1>
            <p className="text-sm text-gray-500">{p?.email}</p>
            <span className="text-xs font-mono px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full mt-1 inline-block">
              {p?.role}
            </span>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          {p?.phone && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Phone</span><span className="text-gray-800">{p.phone}</span></div>}
          {p?.address && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Address</span><span className="text-gray-800">{p.address}</span></div>}
          {p?.createdAt && <div className="flex justify-between py-2"><span className="text-gray-500">Member since</span><span className="text-gray-800">{new Date(p.createdAt).toLocaleDateString()}</span></div>}
        </div>
      </div>
    </div>
  )
}
