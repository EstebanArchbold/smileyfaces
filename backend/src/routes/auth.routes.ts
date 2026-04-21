import { Router } from 'express';
import { login, verify } from '../controllers/auth.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/verify', requireAdmin, verify);

export default router;
