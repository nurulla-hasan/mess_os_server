import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './ai-shopping.controller';
import * as val from './ai-shopping.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getLists);
router.get('/:listId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getListById);

router.post('/generate', authorize(MESS_ROLES.MANAGER), validateRequest(val.generateListSchema), ctl.generateList);

router.post('/:listId/approve', authorize(MESS_ROLES.MANAGER), ctl.approveList);
router.post('/:listId/reject', authorize(MESS_ROLES.MANAGER), ctl.rejectList);
router.post('/:listId/convert', authorize(MESS_ROLES.MANAGER), validateRequest(val.convertListSchema), ctl.convertList);

export const aiShoppingRoutes = router;
