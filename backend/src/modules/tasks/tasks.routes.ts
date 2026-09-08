import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  listTasks,
  getTasksToday,
  createTask,
  updateTask,
  deleteTask,
} from './tasks.controller'

const router = Router()

router.get('/', authenticate, listTasks)
router.get('/today', authenticate, getTasksToday)
router.post('/', authenticate, createTask)
router.put('/:id', authenticate, updateTask)
router.delete('/:id', authenticate, deleteTask)

export default router