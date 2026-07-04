import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './market-price.controller';
import * as val from './market-price.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMarketPrices);
router.post('/bulk', authorize(MESS_ROLES.MANAGER), validateRequest(val.bulkUpsertMarketPriceSchema), ctl.bulkUpsertMarketPrices);
router.post('/reset', authorize(MESS_ROLES.MANAGER), ctl.resetMarketPrices);
router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.upsertMarketPriceSchema), ctl.upsertMarketPrice);
router.delete('/:itemName', authorize(MESS_ROLES.MANAGER), ctl.deleteMarketPrice);

export const marketPriceRoutes = router;
