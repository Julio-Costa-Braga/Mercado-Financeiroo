import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireTeam, requireModules } from '../../middleware/auth'
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

router.get('/', authenticate, requireTeam, requireModules('clients'), listClients)
router.get('/priority', authenticate, requireTeam, requireModules('clients'), getPriorityClients)
router.get('/:id', authenticate, requireTeam, requireModules('clients'), getClient)
router.post('/', authenticate, requireTeam, requireModules('clients'), createClient)
router.put('/:id', authenticate, requireTeam, requireModules('clients'), updateClient)
router.post('/:id/interests', authenticate, requireTeam, requireModules('clients'), addInterest)
router.delete('/:id/interests', authenticate, requireTeam, requireModules('clients'), removeInterest)
router.post('/:id/notes', authenticate, requireTeam, requireModules('clients'), addNote)
router.post('/:id/contacts', authenticate, requireTeam, requireModules('clients'), addContact)

// Documentos do cliente (CRM / equipe)
router.post('/:id/documents', authenticate, requireTeam, requireModules('clients'), upload.single('file'), uploadClientDocument)
router.get('/:id/documents', authenticate, requireTeam, requireModules('clients'), listClientDocuments)
router.get('/:id/documents/:docId/download', authenticate, requireTeam, requireModules('clients'), downloadClientDocument)
router.delete('/:id/documents/:docId', authenticate, requireTeam, requireModules('clients'), deleteClientDocument)

export default router