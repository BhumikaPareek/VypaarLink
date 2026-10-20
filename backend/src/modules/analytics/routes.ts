import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)
router.use(requireRole('SHOPKEEPER'))

router.get('/overview', controller.getOverview)
router.get('/credit-aging', controller.getCreditAging)
router.get('/cashflow', controller.getCashflow)
router.get('/inventory-insights', controller.getInventoryInsights)
router.get('/suppliers', controller.getSupplierInsights)

export default router
