import { Router } from 'express';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as val from './auth.validation';
import * as ctl from './auth.controller';

const router = Router();
router.post('/register', validateRequest(val.registerSchema), ctl.register);
router.post('/login', validateRequest(val.loginSchema), ctl.login);

export const authRoutes = router;
