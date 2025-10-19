export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

// Global state to prevent multiple instances
let globalStatus: Ref<SaveStatus> | null = null
let globalLastSaved: Ref<Date | null> | null = null
let globalErrorMessage: Ref<string> | null = null
let globalDebounceProgress: Ref<number> | null = null
let globalDebounceTimer: Ref<NodeJS.Timeout | null> | null = null

export const useSaveStatus = () => {
  // Initialize global state only once
  if (!globalStatus) {
    globalStatus = ref<SaveStatus>('idle')
    globalLastSaved = ref<Date | null>(null)
    globalErrorMessage = ref<string>('')
    globalDebounceProgress = ref<number>(0)
    globalDebounceTimer = ref<NodeJS.Timeout | null>(null)
  }

  const status = globalStatus
  const lastSaved = globalLastSaved!
  const errorMessage = globalErrorMessage!
  const debounceProgress = globalDebounceProgress!
  const debounceTimer = globalDebounceTimer!
  
  const setPending = (debounceDelay: number) => {
    status.value = 'pending'
    errorMessage.value = ''
    debounceProgress.value = 0
    
    // Clear existing timer
    if (debounceTimer.value) {
      clearInterval(debounceTimer.value)
    }
    
    // Start progress animation
    const startTime = Date.now()
    debounceTimer.value = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / debounceDelay) * 100, 100)
      debounceProgress.value = progress
      
      if (progress >= 100) {
        clearInterval(debounceTimer.value!)
        debounceTimer.value = null
      }
    }, 50) // Update every 50ms for smooth animation
  }
  
  const setSaving = () => {
    status.value = 'saving'
    errorMessage.value = ''
    debounceProgress.value = 100
    
    // Clear progress timer
    if (debounceTimer.value) {
      clearInterval(debounceTimer.value)
      debounceTimer.value = null
    }
  }
  
  const setSaved = () => {
    status.value = 'saved'
    lastSaved.value = new Date()
    debounceProgress.value = 0
    
    // Reset to idle after 3 seconds
    setTimeout(() => {
      if (status.value === 'saved') {
        status.value = 'idle'
      }
    }, 3000)
  }
  
  const setError = (message: string) => {
    status.value = 'error'
    errorMessage.value = message
    debounceProgress.value = 0
    
    // Clear progress timer
    if (debounceTimer.value) {
      clearInterval(debounceTimer.value)
      debounceTimer.value = null
    }
    
    // Reset to idle after 5 seconds
    setTimeout(() => {
      if (status.value === 'error') {
        status.value = 'idle'
        errorMessage.value = ''
      }
    }, 5000)
  }
  
  const setIdle = () => {
    status.value = 'idle'
    errorMessage.value = ''
    debounceProgress.value = 0
    
    // Clear progress timer
    if (debounceTimer.value) {
      clearInterval(debounceTimer.value)
      debounceTimer.value = null
    }
  }
  
  const formatLastSaved = () => {
    if (!lastSaved.value) return ''
    
    const now = new Date()
    const diff = now.getTime() - lastSaved.value.getTime()
    
    if (diff < 1000) return 'Just now'
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    
    return lastSaved.value.toLocaleDateString()
  }
  
  // Clean up on unmount
  onUnmounted(() => {
    if (debounceTimer.value) {
      clearInterval(debounceTimer.value)
    }
  })
  
  return {
    status: readonly(status),
    lastSaved: readonly(lastSaved),
    errorMessage: readonly(errorMessage),
    debounceProgress: readonly(debounceProgress),
    setPending,
    setSaving,
    setSaved,
    setError,
    setIdle,
    formatLastSaved
  }
}
