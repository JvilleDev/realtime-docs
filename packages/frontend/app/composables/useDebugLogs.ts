import { ref, computed } from 'vue'

const logs = ref<Array<{
  id: string
  timestamp: Date
  level: 'log' | 'warn' | 'error' | 'info'
  message: string
  data?: any
}>>([])

const isDebugMode = computed(() => process.dev)

export const useDebugLogs = () => {
  const addLog = (level: 'log' | 'warn' | 'error' | 'info', message: string, data?: any) => {
    if (!isDebugMode.value) return
    
    logs.value.push({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      data
    })
    
    // Keep only last 100 logs to prevent memory issues
    if (logs.value.length > 100) {
      logs.value = logs.value.slice(-100)
    }
  }

  const clearLogs = () => {
    logs.value = []
  }

  const getLogs = () => logs.value

  const getLogsByLevel = (level: 'log' | 'warn' | 'error' | 'info') => {
    return logs.value.filter(log => log.level === level)
  }

  // Override console methods in development
  if (isDebugMode.value && process.client) {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    }

    console.log = (...args) => {
      originalConsole.log(...args)
      addLog('log', args.join(' '), args.length > 1 ? args : undefined)
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      addLog('warn', args.join(' '), args.length > 1 ? args : undefined)
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      addLog('error', args.join(' '), args.length > 1 ? args : undefined)
    }

    console.info = (...args) => {
      originalConsole.info(...args)
      addLog('info', args.join(' '), args.length > 1 ? args : undefined)
    }
  }

  return {
    logs: computed(() => logs.value),
    isDebugMode,
    addLog,
    clearLogs,
    getLogs,
    getLogsByLevel
  }
}