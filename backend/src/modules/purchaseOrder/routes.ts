import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)
router.use(requireRole('SHOPKEEPER'))

router.get('/', controller.listPurchaseOrders)
router.post('/', controller.createPurchaseOrder)
router.get('/:id', controller.getPurchaseOrder)
router.patch('/:id', controller.updatePurchaseOrder)
router.post('/:id/place', controller.placePurchaseOrder)
router.post('/:id/cancel', controller.cancelPurchaseOrder)
router.post('/:id/receipts', controller.recordGoodsReceipt)
router.post('/:id/payments', controller.recordSupplierPayment)

export default router
