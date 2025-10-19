import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

export const useHocuspocus = () => {
  const config = useRuntimeConfig()
  const { token, user } = useAuth()
  
  const provider = ref<HocuspocusProvider | null>(null)
  const document = ref<Y.Doc | null>(null)
  const isConnected = ref(false)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const connect = (documentName: string) => {
    if (provider.value) {
      console.log('Provider already exists, disconnecting first')
      disconnect()
    }
    
    try {
      // Create a new Y document
      const ydoc = new Y.Doc()
      document.value = ydoc
      
      // Determine authentication token
      const authToken = token.value || 'guest'
      
      console.log('🔌 Connecting to Hocuspocus:', {
        url: config.public.hocuspocusUrl,
        documentName,
        authToken: authToken === 'guest' ? 'guest' : 'authenticated',
        user: user.value?.display_name || 'Guest'
      })
      
      // Create Hocuspocus provider
      provider.value = new HocuspocusProvider({
        url: config.public.hocuspocusUrl,
        name: documentName,
        document: ydoc,
        token: authToken,
        onConnect: () => {
          console.log('✅ Connected to Hocuspocus')
          isConnected.value = true
          connectionStatus.value = 'connected'
        },
        onDisconnect: () => {
          console.log('❌ Disconnected from Hocuspocus')
          isConnected.value = false
          connectionStatus.value = 'disconnected'
        },
        onAuthenticationFailed: ({ reason }) => {
          console.error('❌ Authentication failed:', reason)
          connectionStatus.value = 'error'
        },
        onStatus: ({ status }) => {
          console.log('📊 Hocuspocus status:', status)
          if (status === 'connecting') {
            connectionStatus.value = 'connecting'
          }
        },
        onLoadDocument: () => {
          console.log('📄 Document loaded from Hocuspocus')
        },
        onStoreDocument: () => {
          console.log('💾 Document stored to Hocuspocus')
        },
        onAwarenessUpdate: ({ states }) => {
          console.log('👥 Awareness update:', states.size, 'users')
        },
        onSynced: () => {
          console.log('🔄 Document synced with Hocuspocus')
        }
      })
      
    } catch (error) {
      console.error('❌ Error creating Hocuspocus provider:', error)
      connectionStatus.value = 'error'
    }
  }
  
  const disconnect = () => {
    if (provider.value) {
      console.log('🔌 Disconnecting from Hocuspocus')
      provider.value.destroy()
      provider.value = null
      document.value = null
      isConnected.value = false
      connectionStatus.value = 'disconnected'
    }
  }
  
  const getAwareness = () => {
    return provider.value?.awareness || null
  }
  
  const getDocument = () => {
    return document.value
  }
  
  const getProvider = () => {
    return provider.value
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    provider: readonly(provider),
    document: readonly(document),
    isConnected: readonly(isConnected),
    connectionStatus: readonly(connectionStatus),
    connect,
    disconnect,
    getAwareness,
    getDocument,
    getProvider
  }
}
