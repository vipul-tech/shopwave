import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { productApi, cartApi } from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function ProductCard({ product, onAddToCart }) {
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    setAdding(true)
    try {
      await onAddToCart(product.id)
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Product image placeholder */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 h-48 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <svg className="w-16 h-16 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {product.category && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full self-start mb-2">
            {product.category}
          </span>
        )}
        <Link to={`/products/${product.id}`}
          className="font-semibold text-gray-800 hover:text-indigo-600 transition-colors line-clamp-2 mb-1 flex-1">
          {product.name}
        </Link>
        <p className="text-xs text-gray-400 font-mono mb-3">SKU: {product.sku}</p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <div>
            <span className="text-lg font-bold text-gray-900">
              ${parseFloat(product.price).toFixed(2)}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${product.inStock ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-xs ${product.inStock ? 'text-green-600' : 'text-red-500'}`}>
                {product.inStock ? `In stock (${product.stockQty})` : 'Out of stock'}
              </span>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!product.inStock || adding}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg
                       hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {adding ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [params, setParams] = useState({
    search: '', page: 0, size: 12, sortBy: 'createdAt', sortDir: 'desc', inStock: null
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null)
      )
      const res = await productApi.list(cleanParams)
      setProducts(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleAddToCart = async (productId) => {
    if (!user) {
      toast.error('Please login to add items to cart')
      return
    }
    await cartApi.addItem({ productId, quantity: 1 })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} items</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={params.search}
              onChange={e => setParams(p => ({ ...p, search: e.target.value, page: 0 }))}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-64"
            />
          </div>

          <select
            value={params.sortBy + '_' + params.sortDir}
            onChange={e => {
              const [sortBy, sortDir] = e.target.value.split('_')
              setParams(p => ({ ...p, sortBy, sortDir, page: 0 }))
            }}
            className="border border-gray-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name A–Z</option>
          </select>

          <button
            onClick={() => setParams(p => ({ ...p, inStock: p.inStock ? null : true, page: 0 }))}
            className={`text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${
              params.inStock
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            In Stock Only
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-72 animate-pulse">
              <div className="h-48 bg-gray-100 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
            disabled={params.page === 0}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500 px-3">
            Page {params.page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
            disabled={params.page >= totalPages - 1}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
