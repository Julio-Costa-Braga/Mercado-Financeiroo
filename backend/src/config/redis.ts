import { Redis } from 'ioredis'

const url = process.env.REDIS_URL

// Redis é opcional no MVP. Se REDIS_URL não estiver configurado, não bloqueia o startup.
export const redis: Redis | null = url
  ? new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true })
  : null

// Conecta de forma assíncrona e tolerante a falhas
if (redis) {
  redis.connect().catch(() => {
    // ignora falha de conexão (Redis opcional)
  })
  redis.on('error', () => {
    // ignora erros de conexão (Redis opcional)
  })
}