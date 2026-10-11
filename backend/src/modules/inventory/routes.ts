import { Router } from 'express'
import * as controller from './controller'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/requireRole'

const router = Router()

router.use(authenticate)
router.use(requireRole('SHOPKEEPER'))

router.get('/stats', controller.getStats)
router.get('/', controller.listProducts)
router.post('/', controller.createProduct)
router.get('/:id', controller.getProduct)
router.patch('/:id', controller.updateProduct)
router.patch('/:id/archive', controller.archiveProduct)
router.patch('/:id/restore', controller.restoreProduct)
router.post('/:id/stock', controller.adjustStock)
router.get('/:id/movements', controller.getMovements)

export default router
