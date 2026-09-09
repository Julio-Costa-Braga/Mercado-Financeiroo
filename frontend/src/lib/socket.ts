import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  return socket
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket
  const token = localStorage.getItem('accessToken')
  const url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000'

  socket = io(url, {
    auth: { token },
    transports: ['websocket'],
  })

  socket.on('connect', () => {
    console.log('Socket conectado')
  })

  socket.on('connect_error', (err) => {
    console.error('Socket erro:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}