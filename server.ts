import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './api/app';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`TradeAI by PMK Server running on http://0.0.0.0:${PORT} (PORT env: ${process.env.PORT || 'default 3000'})`);
  });

  server.on('error', (err: any) => {
    console.error('Server failed to start or encountered an error:', err);
  });
}

startServer();
