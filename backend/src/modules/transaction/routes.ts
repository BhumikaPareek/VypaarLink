import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)

router.get('/', requireRole('SHOPKEEPER'), controller.getTransactions)
router.post('/credit', requireRole('SHOPKEEPER'), controller.createCredit)
router.post('/payment', requireRole('SHOPKEEPER'), controller.createPayment)
router.get('/customer/:customerId', requireRole('SHOPKEEPER'), controller.getCustomerTransactionsRoute)

router.patch('/:id/confirm', requireRole('CUSTOMER'), controller.confirm)
router.patch('/:id/flag', requireRole('CUSTOMER'), controller.flag)
router.get('/my/:shopId', requireRole('CUSTOMER'), controller.getMyTransactions)

export default router
