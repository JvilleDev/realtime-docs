export const useBackendSync = () => {
  const config = useRuntimeConfig()
  const { token, user } = useAuth()
  
  // Sanitize content before sending to backend
  const sanitizeContent = (content: any): string => {
    try {
      // Ensure content is properly serialized
      if (typeof content === 'string') {
        // If it's already a string, try to parse and re-stringify to ensure it's valid JSON
        const parsed = JSON.parse(content)
        return JSON.stringify(parsed)
      } else {
        // If it's an object, stringify it
        return JSON.stringify(content)
      }
    } catch (error) {
      console.warn('Content sanitization failed, using fallback:', error)
      // Fallback to a safe default
      return JSON.stringify({ type: 'doc', content: [] })
    }
  }

  // Parse content received from backend
  const parseContent = (content: string): any => {
    try {
      return JSON.parse(content)
    } catch (error) {
      console.warn('Content parsing failed, using fallback:', error)
      // Fallback to a safe default
      return { type: 'doc', content: [] }
    }
  }
  
  const isPolling = ref(false)
  const lastSyncTime = ref<Date | null>(null)
  const syncInterval = ref<NodeJS.Timeout | null>(null)
  
  const startPolling = (documentId: string, intervalMs: number = 5000) => {
    if (isPolling.value) return
    
    isPolling.value = true
    console.log(`🔄 Starting backend sync polling for document ${documentId}`)
    
    syncInterval.value = setInterval(async () => {
      await syncWithBackend(documentId)
    }, intervalMs)
  }
  
  const stopPolling = () => {
    if (syncInterval.value) {
      clearInterval(syncInterval.value)
      syncInterval.value = null
    }
    isPolling.value = false
    console.log('⏹️ Stopped backend sync polling')
  }
  
  const syncWithBackend = async (documentId: string) => {
    try {
      // Check if user is authenticated or guest
      const isGuest = !token.value || !user.value
      const backendUrl = config.public.backendUrl
      const url = isGuest 
        ? `${backendUrl}/api/documents/${documentId}?guest=true`
        : `${backendUrl}/api/documents/${documentId}`
      
      const headers: Record<string, string> = isGuest ? {} : {
        'Authorization': `Bearer ${token.value}`
      }
      
      const response = await $fetch(url, {
        headers,
        timeout: 30000, // 30 seconds timeout
        retry: 3,
        retryDelay: 1000
      })
      
      lastSyncTime.value = new Date()
      console.log(`✅ Backend sync completed for document ${documentId}`)
      
      // Parse content if it exists
      if (response && typeof response === 'object' && 'content' in response) {
        (response as any).content = parseContent((response as any).content)
      }
      
      return response
    } catch (error) {
      console.error('❌ Backend sync failed:', error)
      
      // Check if it's a timeout error
      if (error && typeof error === 'object' && 'cause' in error) {
        const cause = (error as any).cause
        if (cause && cause.message && cause.message.includes('Headers Timeout')) {
          console.warn('⏰ Mobile timeout detected, retrying with longer timeout...')
          // Retry with even longer timeout
          try {
            const isGuest = !token.value || !user.value
            const backendUrl = config.public.backendUrl
            const retryUrl = isGuest 
              ? `${backendUrl}/api/documents/${documentId}?guest=true`
              : `${backendUrl}/api/documents/${documentId}`
            
            const retryHeaders: Record<string, string> = isGuest ? {} : {
              'Authorization': `Bearer ${token.value}`
            }
            
            const retryResponse = await $fetch(retryUrl, {
              headers: retryHeaders,
              timeout: 60000, // 60 seconds for retry
              retry: 1
            })
            console.log(`✅ Backend sync retry successful for document ${documentId}`)
            return retryResponse
          } catch (retryError) {
            console.error('❌ Backend sync retry also failed:', retryError)
          }
        }
      }
      
      throw error
    }
  }
  
  const saveToBackend = async (documentId: string, content: any, changeData?: any) => {
    // Guests cannot save documents
    if (!token.value || !user.value) {
      console.log('🚫 Guest users cannot save documents')
      return
    }
    
    try {
      const backendUrl = config.public.backendUrl
      const response = await $fetch(`${backendUrl}/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json'
        },
        body: {
          content: sanitizeContent(content),
          changeData
        },
        timeout: 30000, // 30 seconds timeout
        retry: 3,
        retryDelay: 1000
      })
      
      lastSyncTime.value = new Date()
      console.log(`💾 Document ${documentId} saved to backend`)
      
      return response
    } catch (error) {
      console.error('❌ Failed to save to backend:', error)
      
      // Check if it's a timeout error
      if (error && typeof error === 'object' && 'cause' in error) {
        const cause = (error as any).cause
        if (cause && cause.message && cause.message.includes('Headers Timeout')) {
          console.warn('⏰ Mobile timeout detected during save, retrying...')
          // Retry with longer timeout
          try {
            const backendUrl = config.public.backendUrl
            const retryResponse = await $fetch(`${backendUrl}/api/documents/${documentId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token.value}`,
                'Content-Type': 'application/json'
              },
              body: {
                content: sanitizeContent(content),
                changeData
              },
              timeout: 60000, // 60 seconds for retry
              retry: 1
            })
            console.log(`✅ Document ${documentId} save retry successful`)
            return retryResponse
          } catch (retryError) {
            console.error('❌ Document save retry also failed:', retryError)
          }
        }
      }
      
      throw error
    }
  }
  
  const getDocumentFromBackend = async (documentId: string) => {
    try {
      // Check if user is authenticated or guest
      const isGuest = !token.value || !user.value
      const backendUrl = config.public.backendUrl
      const url = isGuest 
        ? `${backendUrl}/api/documents/${documentId}?guest=true`
        : `${backendUrl}/api/documents/${documentId}`
      
      const headers: Record<string, string> = isGuest ? {} : {
        'Authorization': `Bearer ${token.value}`
      }
      
      const response = await $fetch(url, {
        headers,
        timeout: 30000, // 30 seconds timeout
        retry: 3,
        retryDelay: 1000
      })
      
      console.log(`📥 Document ${documentId} loaded from backend`)
      
      // Parse content if it exists
      if (response && typeof response === 'object' && 'content' in response) {
        (response as any).content = parseContent((response as any).content)
      }
      
      return response
    } catch (error) {
      console.error('❌ Failed to load document from backend:', error)
      
      // Check if it's a timeout error
      if (error && typeof error === 'object' && 'cause' in error) {
        const cause = (error as any).cause
        if (cause && cause.message && cause.message.includes('Headers Timeout')) {
          console.warn('⏰ Mobile timeout detected during load, retrying...')
          // Retry with longer timeout
          try {
            const isGuest = !token.value || !user.value
            const backendUrl = config.public.backendUrl
            const retryUrl = isGuest 
              ? `${backendUrl}/api/documents/${documentId}?guest=true`
              : `${backendUrl}/api/documents/${documentId}`
            
            const retryHeaders: Record<string, string> = isGuest ? {} : {
              'Authorization': `Bearer ${token.value}`
            }
            
            const retryResponse = await $fetch(retryUrl, {
              headers: retryHeaders,
              timeout: 60000, // 60 seconds for retry
              retry: 1
            })
            console.log(`✅ Document ${documentId} load retry successful`)
            return retryResponse
          } catch (retryError) {
            console.error('❌ Document load retry also failed:', retryError)
          }
        }
      }
      
      throw error
    }
  }
  
  const createDocumentInBackend = async (title: string, content: any = {}) => {
    try {
      const backendUrl = config.public.backendUrl
      const response = await $fetch(`${backendUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json'
        },
        body: {
          title,
          content: sanitizeContent(content)
        }
      })
      
      console.log(`📄 Document created in backend:`, (response as any).id)
      return response
    } catch (error) {
      console.error('❌ Failed to create document in backend:', error)
      throw error
    }
  }
  
  const deleteDocumentFromBackend = async (documentId: string) => {
    try {
      const backendUrl = config.public.backendUrl
      await $fetch(`${backendUrl}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })
      
      console.log(`🗑️ Document ${documentId} deleted from backend`)
    } catch (error) {
      console.error('❌ Failed to delete document from backend:', error)
      throw error
    }
  }
  
  onUnmounted(() => {
    stopPolling()
  })
  
  return {
    isPolling: readonly(isPolling),
    lastSyncTime: readonly(lastSyncTime),
    startPolling,
    stopPolling,
    syncWithBackend,
    saveToBackend,
    getDocumentFromBackend,
    createDocumentInBackend,
    deleteDocumentFromBackend,
    sanitizeContent,
    parseContent
  }
}
