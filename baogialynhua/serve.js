const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Handle /api/db endpoint for multi-browser shared database
  if (reqPath === '/api/db' || reqPath.startsWith('/api/db/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET') {
      if (!fs.existsSync(DB_PATH)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ products: [], customers: [], orders: [] }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      fs.createReadStream(DB_PATH).pipe(res);
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          let current = { products: [], customers: [], orders: [] };
          if (fs.existsSync(DB_PATH)) {
            try { current = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch {}
          }

          if (payload.action === 'saveProduct') {
            const list = current.products || [];
            const idx = list.findIndex(p => p.id === payload.product.id);
            if (idx >= 0) list[idx] = payload.product;
            else list.unshift(payload.product);
            current.products = list;
          } else if (payload.action === 'deleteProduct') {
            current.products = (current.products || []).filter(p => p.id !== payload.id);
          } else if (payload.action === 'deleteMultipleProducts') {
            const ids = new Set(payload.ids || []);
            current.products = (current.products || []).filter(p => !ids.has(p.id));
          } else if (payload.action === 'clearAllProducts') {
            current.products = [];
          } else if (payload.action === 'saveOrder') {
            const list = current.orders || [];
            const idx = list.findIndex(o => o.id === payload.order.id);
            if (idx >= 0) list[idx] = payload.order;
            else list.unshift(payload.order);
            current.orders = list;
          } else if (payload.action === 'deleteOrder') {
            current.orders = (current.orders || []).filter(o => o.id !== payload.id);
          } else if (payload.action === 'deleteMultipleOrders') {
            const ids = new Set(payload.ids || []);
            current.orders = (current.orders || []).filter(o => !ids.has(o.id));
          } else if (payload.action === 'clearAllOrders') {
            current.orders = [];
          } else if (payload.action === 'saveCustomer') {
            const list = current.customers || [];
            const idx = list.findIndex(c => c.id === payload.customer.id);
            if (idx >= 0) list[idx] = payload.customer;
            else list.unshift(payload.customer);
            current.customers = list;
          } else if (payload.action === 'deleteCustomer') {
            current.customers = (current.customers || []).filter(c => c.id !== payload.id);
          } else if (payload.action === 'deleteMultipleCustomers') {
            const ids = new Set(payload.ids || []);
            current.customers = (current.customers || []).filter(c => !ids.has(c.id));
          } else if (payload.action === 'clearAllCustomers') {
            current.customers = [];
          } else if (payload.action === 'syncAll' && payload.data) {
            current = { ...current, ...payload.data };
          }

          current.lastUpdated = new Date().toISOString();
          fs.writeFileSync(DB_PATH, JSON.stringify(current, null, 2), 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  let filePath = path.join(ROOT, reqPath);

  // If path is a directory, try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Security check
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA if not an asset
        const indexPath = path.join(ROOT, 'index.html');
        if (fs.existsSync(indexPath) && !path.extname(reqPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }
        res.statusCode = 404;
        res.end('404 Not Found');
      } else {
        res.statusCode = 500;
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
