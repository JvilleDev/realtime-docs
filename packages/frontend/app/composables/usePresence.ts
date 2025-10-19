import { useSocketIO } from './useSocketIO'

export const usePresence = () => {
  const { socket, isConnected, peerId, connect, disconnect, joinDocument, leaveDocument, sendPing } = useSocketIO()
  
  // Presence state
  const activeUsers = ref<Map<string, any>>(new Map())
  const isGuest = ref(false)
  
  // Ping interval
  let pingInterval: NodeJS.Timeout | null = null
  
  // Start ping interval
  const startPingInterval = (documentId: string) => {
    if (pingInterval) return
    
    pingInterval = setInterval(() => {
      if (isConnected.value) {
        sendPing(documentId)
      }
    }, 2500) // Send ping every 2.5 seconds
  }
  
  // Stop ping interval
  const stopPingInterval = () => {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }
  
  // Initialize presence for all users (guests and authenticated)
  const initializePresence = async (documentId: string, guestMode: boolean = false) => {
    console.log('🔍 initializePresence called with:', { documentId, guestMode })
    isGuest.value = guestMode
    
    console.log('👥 Initializing presence for document:', documentId, 'as', guestMode ? 'guest' : 'authenticated user')
    
    // Connect to Socket.IO
    connect()
    
    // Wait for connection
    await new Promise<void>((resolve) => {
      if (isConnected.value) {
        resolve()
        return
      }
      
      const timeout = setTimeout(() => {
        console.warn('⚠️ Socket.IO connection timeout for presence')
        resolve()
      }, 5000)
      
      watch(isConnected, (connected) => {
        if (connected) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })
    
    // Join document room
    joinDocument(documentId, guestMode ? { isGuest: true } : undefined)
    
    // Start ping interval for heartbeat
    startPingInterval(documentId)
    
    // Setup presence event listeners
    if (socket.value) {
      // Handle initial presence data
      socket.value.on('presence:init', (presence: any) => {
        console.log('👥 Initial presence received:', presence)
        console.log('👥 Presence entries:', Object.entries(presence))
        activeUsers.value.clear()
        
        Object.entries(presence).forEach(([userId, userData]: [string, any]) => {
          console.log('👥 Processing user:', { userId, userData })
          if (userData.userInfo) {
            activeUsers.value.set(userId, userData.userInfo)
            console.log('👥 Added user to activeUsers:', { userId, userInfo: userData.userInfo })
          }
        })
        console.log('👥 Final activeUsers size:', activeUsers.value.size)
      })
      
      // Handle presence updates
      socket.value.on('presence:update', (data: any) => {
        console.log('👥 Presence update received:', data)
        
        if (data.type === 'user_joined') {
          activeUsers.value.set(data.userId, data.userInfo)
        } else if (data.type === 'user_left') {
          activeUsers.value.delete(data.userId)
        }
      })
      
      // Handle cursor movements (for presence tracking)
      socket.value.on('cursor:move', (data: any) => {
        if (data.userId !== peerId.value && data.userInfo) {
          // Update user info if it exists
          if (activeUsers.value.has(data.userId)) {
            activeUsers.value.set(data.userId, data.userInfo)
          }
        }
      })
    }
  }
  
  // Clean up presence
  const cleanupPresence = (documentId: string) => {
    // Stop ping interval
    stopPingInterval()
    
    if (isConnected.value) {
      leaveDocument(documentId)
    }
    disconnect()
    activeUsers.value.clear()
  }
  
  // Clean up on unmount
  onUnmounted(() => {
    stopPingInterval()
    cleanupPresence('')
  })
  
  return {
    activeUsers: readonly(activeUsers),
    isGuest,
    initializePresence,
    cleanupPresence
  }
}
