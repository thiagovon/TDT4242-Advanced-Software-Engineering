// Express server entry point
// Serves the compiled React app and exposes /api routes.
// R-5: server-side validation endpoint added in Phase 5
// R-9: version history endpoints added in Phase 6

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api', apiRouter);

// ─── Serve React build (production) ──────────────────────────────────────────

const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(express.static(clientDist));

// All non-API routes fall back to index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`AI Guidebook server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
