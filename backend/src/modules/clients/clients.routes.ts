import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  addInterest,
  removeInterest,
  addNote,
  addContact,
  getPriorityClients,
} from './clients.controller'

const router = Router()

router.get('/', authenticate, listClients)
router.get('/priority', authenticate, getPriorityClients)
router.get('/:id', authenticate, getClient)
router.post('/', authenticate, createClient)
router.put('/:id', authenticate, updateClient)
router.post('/:id/interests', authenticate, addInterest)
router.delete('/:id/interests', authenticate, removeInterest)
router.post('/:id/notes', authenticate, addNote)
router.post('/:id/contacts', authenticate, addContact)

export default router