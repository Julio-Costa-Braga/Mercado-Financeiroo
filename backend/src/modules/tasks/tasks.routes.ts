import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import {
  listTasks,
  getTasksToday,
  createTask,
  updateTask,
  deleteTask,
} from './tasks.controller'

const router = Router()

router.get('/', authenticate, requireModules('tasks'), listTasks)
router.get('/today', authenticate, requireModules('tasks'), getTasksToday)
router.post('/', authenticate, requireModules('tasks'), createTask)
router.put('/:id', authenticate, requireModules('tasks'), updateTask)
router.delete('/:id', authenticate, requireModules('tasks'), deleteTask)

export default router