import { Router } from 'express';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { optionalAuth } from '../../shared/middlewares/authenticate';
import * as ctl from './docs-chat.controller';
import * as val from './docs-chat.validation';

const router = Router();

router.post('/', optionalAuth, validateRequest(val.chatSchema), ctl.chat);
router.get('/', optionalAuth, validateRequest(val.sessionQuerySchema), ctl.getHistory);
router.delete('/', optionalAuth, validateRequest(val.sessionQuerySchema), ctl.deleteHistory);

export const docsChatRoutes = router;
