import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './notice.controller';
import * as val from './notice.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.listNoticesSchema), ctl.getNotices);
router.get('/:noticeId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.noticeIdParamSchema), ctl.getNotice);

router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.createNoticeSchema), ctl.createNotice);

router.patch('/:noticeId', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateNoticeSchema), ctl.updateNotice);
router.patch('/:noticeId/pin', authorize(MESS_ROLES.MANAGER), validateRequest(val.setNoticePinSchema), ctl.setNoticePinState);
router.post('/:noticeId/pin', authorize(MESS_ROLES.MANAGER), validateRequest(val.noticeIdParamSchema), ctl.pinNotice);
router.post('/:noticeId/archive', authorize(MESS_ROLES.MANAGER), validateRequest(val.noticeIdParamSchema), ctl.archiveNotice);

export const noticeRoutes = router;
