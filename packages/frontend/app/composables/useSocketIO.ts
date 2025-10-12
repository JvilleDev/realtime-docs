import { io, Socket } from 'socket.io-client'

export const useSocketIO = () => {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const peerId = ref<string | null>(null)
  const { token, user } = useAuth()

  const connect = () => {
    if (socket.value?.connected) {
      console.log('🔌 Socket already connected')
      return
    }

    try {
      const config = useRuntimeConfig()
      const socketUrl = config.public.backendUrl || 'http://localhost:3001'
      
      console.log('🔌 Connecting to Socket.IO server:', socketUrl)
      
      socket.value = io(socketUrl, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: {
          token: token.value,
          guest: !token.value || !user.value
        }
      })

      // Connection events
      socket.value.on('connect', () => {
        console.log('✅ Socket.IO connected:', socket.value?.id)
        isConnected.value = true
        peerId.value = socket.value?.id || null
      })

      socket.value.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason)
        isConnected.value = false
        peerId.value = null
      })

      socket.value.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error)
        isConnected.value = false
      })

    } catch (error) {
      console.error('❌ Failed to create Socket.IO connection:', error)
    }
  }

  const disconnect = () => {
    if (socket.value) {
      console.log('🔌 Disconnecting Socket.IO')
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
      peerId.value = null
    }
  }

  const joinDocument = (documentId: string, userInfo?: any) => {
    if (!socket.value?.connected) {
      console.warn('⚠️ Socket not connected, cannot join document')
      return
    }

    console.log('📄 Joining document:', documentId)
    socket.value.emit('document:join', documentId)
  }

  const leaveDocument = (documentId: string) => {
    if (!socket.value?.connected) {
      console.warn('⚠️ Socket not connected, cannot leave document')
      return
    }

    console.log('📄 Leaving document:', documentId)
    socket.value.emit('document:leave', documentId)
  }

  const updateDocument = (documentId: string, content: any, changeData?: any) => {
    if (!socket.value?.connected) {
      console.warn('⚠️ Socket not connected, cannot update document')
      return
    }

    console.log('📝 Updating document:', documentId)
    socket.value.emit('document:update', {
      documentId,
      content,
      changeData
    })
  }

  const moveCursor = (documentId: string, position: { anchor: number; head: number }) => {
    if (!socket.value?.connected) {
      console.warn('⚠️ Socket not connected, cannot move cursor')
      return
    }

    socket.value.emit('cursor:move', {
      documentId,
      position
    })
  }

  const startTyping = (documentId: string) => {
    if (!socket.value?.connected) {
      console.warn('⚠️ Socket not connected, cannot start typing')
      return
    }

    socket.value.emit('typing:start', documentId)
  }

  const stopTyping = (documentId: string) => {
    if (!socket.value?.connected) {
      console.warn('⚠️ Socket not connected, cannot stop typing')
      return
    }

    socket.value.emit('typing:stop', documentId)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected: readonly(isConnected),
    peerId: readonly(peerId),
    connect,
    disconnect,
    joinDocument,
    leaveDocument,
    updateDocument,
    moveCursor,
    startTyping,
    stopTyping
  }
}
