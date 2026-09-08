import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { listUsers, createUser, updateUser, deleteUser } from './admin.controller'

const router = Router()

router.use(authenticate)
router.use(requireRole('ADMIN', 'MANAGER'))

router.get('/users', listUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router