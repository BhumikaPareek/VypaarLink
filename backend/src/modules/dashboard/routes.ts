import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)

router.get('/', requireRole('SHOPKEEPER'), controller.getDashboard)
router.get('/customer', requireRole('CUSTOMER'), controller.getCustomerDashboard)

export default router
