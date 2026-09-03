// import axios from 'axios'

// // Each service has its own base URL — routed through ALB in production
// const SERVICES = {
//   users:    import.meta.env.VITE_USER_SERVICE_URL    || 'http://localhost:8081/api',
//   products: import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8082/api',
//   orders:   import.meta.env.VITE_ORDER_SERVICE_URL   || 'http://localhost:8083/api',
// }

// // Create an axios instance per service
// const createClient = (baseURL) => {
//   const client = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

//   client.interceptors.request.use(config => {
//     const token = localStorage.getItem('token')
//     if (token) config.headers.Authorization = `Bearer ${token}`
//     return config
//   })

//   client.interceptors.response.use(
//     res => res,
//     err => {
//       if (err.response?.status === 401) {
//         localStorage.removeItem('token')
//         localStorage.removeItem('user')
//         window.location.href = '/login'
//       }
//       return Promise.reject(err)
//     }
//   )
//   return client
// }

// export const userClient    = createClient(SERVICES.users)
// export const productClient = createClient(SERVICES.products)
// export const orderClient   = createClient(SERVICES.orders)

// // ── Auth API ──────────────────────────────────────────────────────────────────
// export const authApi = {
//   register: (data) => userClient.post('/users/register', data),
//   login:    (data) => userClient.post('/users/login', data),
//   profile:  ()     => userClient.get('/users/profile'),
//   updateProfile: (data) => userClient.put('/users/profile', data),
// }

// // ── Product API ───────────────────────────────────────────────────────────────
// export const productApi = {
//   list: (params) => productClient.get('/products', { params }),
//   getById: (id) => productClient.get(`/products/${id}`),
//   create:  (data) => productClient.post('/products', data),
//   update:  (id, data) => productClient.put(`/products/${id}`, data),
//   delete:  (id) => productClient.delete(`/products/${id}`),
// }

// // ── Cart API ──────────────────────────────────────────────────────────────────
// export const cartApi = {
//   getCart:        ()              => orderClient.get('/cart'),
//   addItem:        (data)          => orderClient.post('/cart/items', data),
//   removeItem:     (productId)     => orderClient.delete(`/cart/items/${productId}`),
//   clearCart:      ()              => orderClient.delete('/cart'),
// }

// // ── Order API ─────────────────────────────────────────────────────────────────
// export const orderApi = {
//   placeOrder: (data)     => orderClient.post('/orders', data),
//   getOrders:  (params)   => orderClient.get('/orders', { params }),
//   getById:    (id)       => orderClient.get(`/orders/${id}`),
//   cancel:     (id)       => orderClient.patch(`/orders/${id}/cancel`),
// }

import axios from 'axios'

// Each service has its own base URL — routed through ALB in production
const SERVICES = {
  users:    import.meta.env.VITE_USER_SERVICE_URL    || 'http://localhost:8081/api',
  products: import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8082/api',
  orders:   import.meta.env.VITE_ORDER_SERVICE_URL   || 'http://localhost:8083/api',
}

// Create an axios instance per service
const createClient = (baseURL) => {
  const client = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

  client.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )
  return client
}

export const userClient    = createClient(SERVICES.users)
export const productClient = createClient(SERVICES.products)
export const orderClient   = createClient(SERVICES.orders)

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => userClient.post('/users/register', data),
  login:    (data) => userClient.post('/users/login', data),
  profile:  ()     => userClient.get('/users/profile'),
  updateProfile: (data) => userClient.put('/users/profile', data),
}

// ── Product API ───────────────────────────────────────────────────────────────
export const productApi = {
  list: (params) => productClient.get('/products', { params }),
  getById: (id) => productClient.get(`/products/${id}`),
  create:  (data) => productClient.post('/products', data),
  update:  (id, data) => productClient.put(`/products/${id}`, data),
  delete:  (id) => productClient.delete(`/products/${id}`),
}

// ── Cart API ──────────────────────────────────────────────────────────────────
export const cartApi = {
  getCart:        ()              => orderClient.get('/cart'),
  addItem:        (data)          => orderClient.post('/cart/items', data),
  removeItem:     (productId)     => orderClient.delete(`/cart/items/${productId}`),
  clearCart:      ()              => orderClient.delete('/cart'),
}

// ── Order API ─────────────────────────────────────────────────────────────────
export const orderApi = {
  placeOrder: (data)     => orderClient.post('/orders', data),
  getOrders:  (params)   => orderClient.get('/orders', { params }),
  getById:    (id)       => orderClient.get(`/orders/${id}`),
  cancel:     (id)       => orderClient.patch(`/orders/${id}/cancel`),
}

// ── Admin APIs ────────────────────────────────────────────────────────────────

// Admin: all orders + status update
export const adminOrderApi = {
  getAllOrders:  (params)     => orderClient.get('/admin/orders', { params }),
  updateStatus: (id, status) => orderClient.patch(`/admin/orders/${id}/status`, null, { params: { status } }),
}

// Admin: all users
export const adminUserApi = {
  getAllUsers: () => userClient.get('/users/admin/users'),
}

// Admin: product management
export const adminProductApi = {
  create:  (data)     => productClient.post('/products', data),
  update:  (id, data) => productClient.put(`/products/${id}`, data),
  delete:  (id)       => productClient.delete(`/products/${id}`),
}
