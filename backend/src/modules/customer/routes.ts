import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)
router.use(requireRole('SHOPKEEPER'))

router.get('/', controller.listCustomers)
router.post('/', controller.addCustomer)
router.get('/:customerId', controller.getCustomer)
router.patch('/:customerId', controller.updateCustomer)
router.delete('/:customerId', controller.removeCustomer)

export default router
