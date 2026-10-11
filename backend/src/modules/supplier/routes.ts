import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)
router.use(requireRole('SHOPKEEPER'))

router.get('/stats', controller.getStats)
router.get('/', controller.listSuppliers)
router.post('/', controller.createSupplier)
router.get('/:id', controller.getSupplier)
router.patch('/:id', controller.updateSupplier)
router.patch('/:id/archive', controller.archiveSupplier)
router.patch('/:id/restore', controller.restoreSupplier)

export default router
