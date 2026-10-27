import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function dbApiPlugin(): Plugin {
  const dbPath = path.resolve(__dirname, '../baogialynhua/db.json')
  return {
    name: 'db-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (url !== '/api/db' && !url.startsWith('/api/db/')) {
          return next()
        }
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          if (!fs.existsSync(dbPath)) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ products: [], customers: [], orders: [] }))
            return
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          fs.createReadStream(dbPath).pipe(res)
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              let current: any = { products: [], customers: [], orders: [] }
              if (fs.existsSync(dbPath)) {
                try { current = JSON.parse(fs.readFileSync(dbPath, 'utf8')) } catch {}
              }

              if (payload.action === 'saveProduct') {
                const list = current.products || []
                const idx = list.findIndex((p: any) => p.id === payload.product.id)
                if (idx >= 0) list[idx] = payload.product
                else list.unshift(payload.product)
                current.products = list
              } else if (payload.action === 'deleteProduct') {
                current.products = (current.products || []).filter((p: any) => p.id !== payload.id)
              } else if (payload.action === 'saveOrder') {
                const list = current.orders || []
                const idx = list.findIndex((o: any) => o.id === payload.order.id)
                if (idx >= 0) list[idx] = payload.order
                else list.unshift(payload.order)
                current.orders = list
              } else if (payload.action === 'deleteOrder') {
                current.orders = (current.orders || []).filter((o: any) => o.id !== payload.id)
              } else if (payload.action === 'saveCustomer') {
                const list = current.customers || []
                const idx = list.findIndex((c: any) => c.id === payload.customer.id)
                if (idx >= 0) list[idx] = payload.customer
                else list.unshift(payload.customer)
                current.customers = list
              } else if (payload.action === 'deleteCustomer') {
                current.customers = (current.customers || []).filter((c: any) => c.id !== payload.id)
              } else if (payload.action === 'syncAll' && payload.data) {
                current = { ...current, ...payload.data }
              }

              current.lastUpdated = new Date().toISOString()
              fs.writeFileSync(dbPath, JSON.stringify(current, null, 2), 'utf8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: true }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dbApiPlugin()],
})
