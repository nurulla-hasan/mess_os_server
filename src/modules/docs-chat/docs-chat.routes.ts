import { Router } from 'express';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './docs-chat.controller';
import * as val from './docs-chat.validation';

const router = Router();

router.post('/', validateRequest(val.chatSchema), ctl.chat);
router.get('/', validateRequest(val.sessionQuerySchema), ctl.getHistory);
router.delete('/', validateRequest(val.sessionQuerySchema), ctl.deleteHistory);

export const docsChatRoutes = router;
