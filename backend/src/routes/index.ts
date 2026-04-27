import { Router } from 'express';
import tasksRouter from './tasks';
import resultsRouter from './results';

const router = Router();

// Mount route modules
router.use('/tasks', tasksRouter);
router.use('/', resultsRouter);

export default router;
