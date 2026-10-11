import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)

router.get('/me', controller.getMe)
router.post('/setup', requireRole('SHOPKEEPER'), controller.setupShop)
router.patch('/me', requireRole('SHOPKEEPER'), controller.updateShop)

export default router
