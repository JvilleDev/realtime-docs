export const useDebugLogs = () => {
  const logs = ref<Array<{ timestamp: string; level: string; message: string; data?: any }>>([])
  const isCapturing = ref(false)
  const maxLogs = 1000 // Limit to prevent memory issues

  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  }

  const addLog = (level: string, message: string, ...args: any[]) => {
    if (!isCapturing.value) return

    const timestamp = new Date().toLocaleTimeString()
    const logEntry = {
      timestamp,
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data: args.length > 0 ? args : undefined
    }

    logs.value.unshift(logEntry)
    
    // Keep only the last maxLogs entries
    if (logs.value.length > maxLogs) {
      logs.value = logs.value.slice(0, maxLogs)
    }
  }

  const startCapturing = () => {
    if (isCapturing.value) return

    isCapturing.value = true
    logs.value = []

    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args)
      addLog('log', args[0], ...args.slice(1))
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      addLog('warn', args[0], ...args.slice(1))
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      addLog('error', args[0], ...args.slice(1))
    }

    console.info = (...args) => {
      originalConsole.info(...args)
      addLog('info', args[0], ...args.slice(1))
    }

    console.debug = (...args) => {
      originalConsole.debug(...args)
      addLog('debug', args[0], ...args.slice(1))
    }

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      addLog('error', `Unhandled Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      })
    })

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      addLog('error', `Unhandled Promise Rejection: ${event.reason}`, event.reason)
    })

    console.log('🔍 Debug log capture started')
  }

  const stopCapturing = () => {
    if (!isCapturing.value) return

    isCapturing.value = false

    // Restore original console methods
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.info = originalConsole.info
    console.debug = originalConsole.debug

    // Remove event listeners
    window.removeEventListener('error', () => {})
    window.removeEventListener('unhandledrejection', () => {})

    console.log('🔍 Debug log capture stopped')
  }

  const clearLogs = () => {
    logs.value = []
  }

  const exportLogs = () => {
    const logText = logs.value.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyLogs = async () => {
    const logText = logs.value.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n')
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(logText)
        console.log('📋 Logs copied to clipboard')
        return { success: true, method: 'clipboard' }
      } else {
        // Fallback to legacy method
        const textArea = document.createElement('textarea')
        textArea.value = logText
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          document.body.removeChild(textArea)
          
          if (successful) {
            console.log('📋 Logs copied to clipboard (legacy method)')
            return { success: true, method: 'legacy' }
          } else {
            throw new Error('Legacy copy command failed')
          }
        } catch (legacyError) {
          document.body.removeChild(textArea)
          throw legacyError
        }
      }
    } catch (error) {
      console.error('Failed to copy logs:', error)
      
      // If all else fails, show the text in a prompt for manual copying
      const userConfirmed = confirm(
        'Unable to copy to clipboard automatically. Would you like to see the logs in a popup for manual copying?'
      )
      
      if (userConfirmed) {
        const popup = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')
        if (popup) {
          popup.document.write(`
            <html>
              <head><title>Debug Logs</title></head>
              <body>
                <h2>Debug Logs</h2>
                <p>Select all text below and copy manually:</p>
                <textarea style="width: 100%; height: 80%; font-family: monospace; font-size: 12px;" readonly>${logText}</textarea>
                <br><br>
                <button onclick="document.querySelector('textarea').select(); document.execCommand('copy'); alert('Text selected! Press Ctrl+C to copy.');">Select All</button>
              </body>
            </html>
          `)
          popup.document.close()
        }
      }
      
      return { success: false, error: error.message }
    }
  }

  // Auto-start capturing in development
  if (process.dev) {
    // Check if we're in a component context
    const instance = getCurrentInstance()
    if (instance) {
      // We're in a component, use lifecycle hooks
      onMounted(() => {
        startCapturing()
      })

      onUnmounted(() => {
        stopCapturing()
      })
    } else {
      // We're not in a component context, start immediately
      // This happens when the composable is imported globally
      if (process.client) {
        startCapturing()
      }
    }
  }

  return {
    logs: readonly(logs),
    isCapturing: readonly(isCapturing),
    startCapturing,
    stopCapturing,
    clearLogs,
    exportLogs,
    copyLogs
  }
}