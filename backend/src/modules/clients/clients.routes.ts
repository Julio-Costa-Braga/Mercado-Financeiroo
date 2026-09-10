import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireTeam } from '../../middleware/auth'
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
import {
  uploadClientDocument,
  listClientDocuments,
  downloadClientDocument,
  deleteClientDocument,
} from '../documents/documents.controller'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } })

const router = Router()

router.get('/', authenticate, requireTeam, listClients)
router.get('/priority', authenticate, requireTeam, getPriorityClients)
router.get('/:id', authenticate, requireTeam, getClient)
router.post('/', authenticate, requireTeam, createClient)
router.put('/:id', authenticate, requireTeam, updateClient)
router.post('/:id/interests', authenticate, requireTeam, addInterest)
router.delete('/:id/interests', authenticate, requireTeam, removeInterest)
router.post('/:id/notes', authenticate, requireTeam, addNote)
router.post('/:id/contacts', authenticate, requireTeam, addContact)

// Documentos do cliente (CRM / equipe)
router.post('/:id/documents', authenticate, requireTeam, upload.single('file'), uploadClientDocument)
router.get('/:id/documents', authenticate, requireTeam, listClientDocuments)
router.get('/:id/documents/:docId/download', authenticate, requireTeam, downloadClientDocument)
router.delete('/:id/documents/:docId', authenticate, requireTeam, deleteClientDocument)

export default router