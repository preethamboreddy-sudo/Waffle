import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbStore } from './src/server/db/store';
import { postsDatabase } from './src/server/db/posts';
import { authUsersDatabase } from './src/server/db/auth-users';
import { apiRouter } from './src/server/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await dbStore.connect();
  await postsDatabase.connect();
  await authUsersDatabase.connect();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const apiOnly = process.argv.includes('--api-only') || process.env.API_ONLY === 'true';

  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.has(origin)) return callback(null, false);
      return callback(null, origin);
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Mount API endpoints
  app.use('/api', apiRouter);

  app.get('/admin', (_req, res) => res.redirect(308, '/admin/'));

  if (!isProduction && !apiOnly) {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'mpa',
    });
    app.use(vite.middlewares);
  } else if (isProduction) {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    const adminEntry = path.resolve(distPath, 'admin', 'index.html');
    app.use(express.static(distPath));
    app.get('/admin/*', (_req, res) => {
      res.sendFile(adminEntry);
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Waffle Pops and Company] Server running at http://0.0.0.0:${PORT} (env: ${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
