<template>
  <div v-if="isDebugMode" class="fixed bottom-6 left-6 z-[60]">
    <!-- Debug Button -->
    <Button
      @click="showDebugPanel = !showDebugPanel"
      class="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-purple-600 hover:bg-purple-700"
      size="sm"
    >
      <Icon name="heroicons:bug-ant" class="w-5 h-5 text-white" />
    </Button>

    <!-- Debug Panel -->
    <div
      v-if="showDebugPanel"
      class="absolute bottom-16 left-0 w-80 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
    >
      <!-- Panel Header -->
      <div class="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <h3 class="text-sm font-semibold text-gray-800">Debug Logs</h3>
        <div class="flex items-center gap-2">
          <Button
            @click="clearLogs"
            variant="outline"
            size="sm"
            class="text-xs px-2 py-1 h-6"
          >
            Clear
          </Button>
          <Button
            @click="showDebugPanel = false"
            variant="ghost"
            size="sm"
            class="text-xs px-2 py-1 h-6"
          >
            <Icon name="heroicons:x-mark" class="w-3 h-3" />
          </Button>
        </div>
      </div>

      <!-- Logs Content -->
      <div class="max-h-80 overflow-y-auto">
        <div v-if="logs.length === 0" class="p-4 text-center text-gray-500 text-sm">
          No logs yet
        </div>
        
        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="log in logs"
            :key="log.id"
            class="p-3 text-xs"
            :class="{
              'bg-red-50': log.level === 'error',
              'bg-yellow-50': log.level === 'warn',
              'bg-blue-50': log.level === 'info',
              'bg-gray-50': log.level === 'log'
            }"
          >
            <div class="flex items-start gap-2">
              <span
                class="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                :class="{
                  'bg-red-500': log.level === 'error',
                  'bg-yellow-500': log.level === 'warn',
                  'bg-blue-500': log.level === 'info',
                  'bg-gray-500': log.level === 'log'
                }"
              ></span>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-700">{{ log.level.toUpperCase() }}</span>
                  <span class="text-gray-400">{{ formatTime(log.timestamp) }}</span>
                </div>
                
                <div class="text-gray-800 break-words">{{ log.message }}</div>
                
                <div v-if="log.data" class="mt-2">
                  <pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{{ JSON.stringify(log.data, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Footer -->
      <div class="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        {{ logs.length }} logs
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'

const { logs, isDebugMode, clearLogs } = useDebugLogs()
const showDebugPanel = ref(false)

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>
