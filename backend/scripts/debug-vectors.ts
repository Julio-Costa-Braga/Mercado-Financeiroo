import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const chunks: any[] = await p.$queryRawUnsafe(`
    SELECT c.id, d.title, c."chunkIndex", c.embedding IS NOT NULL AS has_emb,
           left(c.embedding::text, 120) AS emb_preview
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeDoc" d ON d.id = c."docId"
    ORDER BY d."createdAt" DESC
  `)
  for (const c of chunks) {
    console.log(c.title.slice(0, 50), '| chunk', c.chunkIndex, '| has_emb:', c.has_emb, '|', c.emb_preview ?? 'NULL')
  }
}
main().finally(() => p.$disconnect())