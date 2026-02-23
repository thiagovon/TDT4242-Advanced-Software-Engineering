// Root API router — aggregates all route modules

import { Router } from 'express';
import assignmentsRouter from './assignments.js';
import interactionsRouter from './interactions.js';
import declarationsRouter from './declarations.js';
import versionHistoryRouter from './versionHistory.js';
import manualEntriesRouter from './manualEntries.js';
import regenerateRouter from './regenerate.js';
import validateRouter from './validate.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/assignments', assignmentsRouter);
router.use('/interactions', interactionsRouter);
router.use('/declarations', declarationsRouter);
// R-10: manual entries nested under declarations
router.use('/declarations/:id/manual-entries', manualEntriesRouter);
router.use('/version-history', versionHistoryRouter);
router.use('/declarations', regenerateRouter); // R-13: /api/declarations/:id/regenerate
router.use('/validate', validateRouter);       // R-5: server-side reflection validation gate

export default router;
