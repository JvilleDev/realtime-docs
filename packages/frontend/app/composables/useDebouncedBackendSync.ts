// Global instance to prevent multiple instances
let globalDebouncedSync: any = null

export const useDebouncedBackendSync = () => {
  // Return existing instance if available
  if (globalDebouncedSync) {
    return globalDebouncedSync
  }

  const { saveToBackend } = useBackendSync()
  const { setPending, setSaving, setSaved, setError } = useSaveStatus()
  
  // Debounce configuration
  const debounceDelay = 2000 // 2 seconds
  const pendingUpdates = ref<Map<string, { content: any; changeData?: any; timeout?: NodeJS.Timeout }>>(new Map())
  
  const debouncedSave = (documentId: string, content: any, changeData?: any) => {
    // Clear existing timeout for this document
    const existing = pendingUpdates.value.get(documentId)
    if (existing?.timeout) {
      clearTimeout(existing.timeout)
    }
    
    // Set pending state immediately when changes are detected
    console.log('🔄 Setting pending state with debounce delay:', debounceDelay)
    setPending(debounceDelay)
    console.log('✅ Pending state set')
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        console.log(`💾 Debounced save for document ${documentId}`)
        setSaving()
        await saveToBackend(documentId, content, changeData)
        setSaved()
        
        // Remove from pending updates
        pendingUpdates.value.delete(documentId)
      } catch (error) {
        console.error(`❌ Debounced save failed for document ${documentId}:`, error)
        setError(error instanceof Error ? error.message : 'Failed to save document')
        // Keep the update pending for retry
      }
    }, debounceDelay)
    
    // Store the pending update
    pendingUpdates.value.set(documentId, {
      content,
      changeData,
      timeout
    })
    
    console.log(`⏰ Debounced save scheduled for document ${documentId} in ${debounceDelay}ms`)
  }
  
  const flushPendingUpdates = async () => {
    const updates = Array.from(pendingUpdates.value.entries())
    
    for (const [documentId, update] of updates) {
      if (update.timeout) {
        clearTimeout(update.timeout)
      }
      
      try {
        console.log(`🚀 Flushing pending update for document ${documentId}`)
        setSaving()
        await saveToBackend(documentId, update.content, update.changeData)
        setSaved()
        pendingUpdates.value.delete(documentId)
      } catch (error) {
        console.error(`❌ Failed to flush update for document ${documentId}:`, error)
        setError(error instanceof Error ? error.message : 'Failed to save document')
      }
    }
  }
  
  const cancelPendingUpdates = (documentId?: string) => {
    if (documentId) {
      const update = pendingUpdates.value.get(documentId)
      if (update?.timeout) {
        clearTimeout(update.timeout)
        pendingUpdates.value.delete(documentId)
        console.log(`❌ Cancelled pending update for document ${documentId}`)
      }
    } else {
      // Cancel all pending updates
      for (const [docId, update] of pendingUpdates.value.entries()) {
        if (update.timeout) {
          clearTimeout(update.timeout)
        }
      }
      pendingUpdates.value.clear()
      console.log(`❌ Cancelled all pending updates`)
    }
  }
  
  const getPendingUpdatesCount = () => {
    return pendingUpdates.value.size
  }
  
  const getPendingDocuments = () => {
    return Array.from(pendingUpdates.value.keys())
  }
  
  // Clean up on unmount
  onUnmounted(() => {
    cancelPendingUpdates()
  })
  
  // Create and store the global instance
  globalDebouncedSync = {
    debouncedSave,
    flushPendingUpdates,
    cancelPendingUpdates,
    getPendingUpdatesCount,
    getPendingDocuments,
    pendingUpdates: readonly(pendingUpdates)
  }

  return globalDebouncedSync
}

