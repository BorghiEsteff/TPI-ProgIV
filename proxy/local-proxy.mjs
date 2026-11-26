import http from 'http';
import net from 'net';

const LISTEN_HOST = process.env.PROXY_HOST || '127.0.0.1';
const LISTEN_PORT = Number(process.env.PROXY_PORT || 8088);

const TARGETS = {
  django: { host: '127.0.0.1', port: Number(process.env.DJANGO_PORT || 8000) },
  node: { host: '127.0.0.1', port: Number(process.env.NODE_PORT || 5000) },
  frontend: { host: '127.0.0.1', port: Number(process.env.FRONTEND_PORT || 5173) },
};

const resolveRoute = (urlPath = '/') => {
  if (urlPath.startsWith('/django/')) {
    return { target: TARGETS.django, path: urlPath.slice('/django'.length) || '/' };
  }
  if (urlPath === '/django') {
    return { target: TARGETS.django, path: '/' };
  }
  if (urlPath.startsWith('/node/')) {
    return { target: TARGETS.node, path: urlPath.slice('/node'.length) || '/' };
  }
  if (urlPath === '/node') {
    return { target: TARGETS.node, path: '/' };
  }
  if (urlPath.startsWith('/static/') || /^\/media\/(submission_posters\/|.*\.(png|jpe?g|webp|gif|svg|ico)(\?.*)?$)/i.test(urlPath)) {
    return { target: TARGETS.django, path: urlPath };
  }
  return { target: TARGETS.frontend, path: urlPath };
};

const server = http.createServer((req, res) => {
  const { target, path } = resolveRoute(req.url || '/');
  const headers = { ...req.headers };
  if (req.headers.host) {
    headers['x-forwarded-host'] = req.headers.host;
  }
  if (!headers['x-forwarded-proto']) {
    headers['x-forwarded-proto'] = 'http';
  }

  const proxyReq = http.request(
    {
      hostname: target.host,
      port: target.port,
      path,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'PROXY_UPSTREAM_ERROR', detail: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

// Soporte WebSocket (Vite HMR en desarrollo local)
server.on('upgrade', (req, socket, head) => {
  const { target, path } = resolveRoute(req.url || '/');
  const upstream = net.connect(target.port, target.host, () => {
    let rawHeaders = `${req.method} ${path} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      rawHeaders += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    rawHeaders += '\r\n';
    upstream.write(rawHeaders);
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[CineTrack Proxy] Escuchando en http://${LISTEN_HOST}:${LISTEN_PORT}`);
});
