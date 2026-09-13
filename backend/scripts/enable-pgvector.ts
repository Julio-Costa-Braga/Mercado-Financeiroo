import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  try {
    await p.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
    console.log('pgvector OK')
  } catch (e: any) {
    console.error('ERR', e.message)
    process.exit(1)
  } finally {
    await p.$disconnect()
  }
}
main()