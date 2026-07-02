import { Router } from 'express';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './docs-chat.controller';
import * as val from './docs-chat.validation';

const router = Router();

router.post('/', validateRequest(val.chatSchema), ctl.chat);

export const docsChatRoutes = router;
