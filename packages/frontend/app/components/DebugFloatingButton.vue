<template>
  <div class="debug-floating-button">
    <!-- Floating Debug Button -->
    <Button
      icon="pi pi-bug"
      severity="secondary"
      size="small"
      class="debug-toggle-btn"
      @click="showDebugPanel = !showDebugPanel"
      :badge="logs.length > 0 ? logs.length.toString() : undefined"
      badge-severity="danger"
    />
    
    <!-- Debug Panel -->
    <div v-if="showDebugPanel" class="debug-panel">
      <div class="debug-header">
        <h3>Registros de Depuración</h3>
        <div class="debug-controls">
          <Button
            icon="pi pi-trash"
            size="small"
            severity="secondary"
            @click="handleClearLogs"
            tooltip="Limpiar registros"
          />
          <Button
            icon="pi pi-copy"
            size="small"
            severity="secondary"
            @click="handleCopyLogs"
            tooltip="Copiar registros"
          />
          <Button
            icon="pi pi-download"
            size="small"
            severity="secondary"
            @click="handleExportLogs"
            tooltip="Exportar registros"
          />
          <Button
            icon="pi pi-times"
            size="small"
            severity="secondary"
            @click="showDebugPanel = false"
            tooltip="Cerrar"
          />
        </div>
      </div>
      
      <div class="debug-stats">
        <span class="log-count">{{ logs.length }} registros</span>
        <span class="capture-status" :class="{ active: isCapturing }">
          {{ isCapturing ? 'Capturando' : 'Detenido' }}
        </span>
      </div>
      
      <div class="debug-logs" ref="logsContainer">
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-entry"
          :class="log.level"
        >
          <div class="log-header">
            <span class="log-timestamp">{{ log.timestamp }}</span>
            <span class="log-level">{{ log.level.toUpperCase() }}</span>
          </div>
          <div class="log-message">{{ log.message }}</div>
          <div v-if="log.data" class="log-data">
            <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
        </div>
        
        <div v-if="logs.length === 0" class="no-logs">
          <i class="pi pi-info-circle"></i>
          <span>Aún no se han capturado registros</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useToast } from 'primevue/usetoast'

const { logs, isCapturing, clearLogs, exportLogs, copyLogs } = useDebugLogs()
const toast = useToast()

const showDebugPanel = ref(false)
const logsContainer = ref<HTMLElement>()

// Auto-scroll to top when new logs are added
watch(logs, async () => {
  if (showDebugPanel.value && logsContainer.value) {
    await nextTick()
    logsContainer.value.scrollTop = 0
  }
}, { deep: true })

// Auto-scroll when panel opens
watch(showDebugPanel, async (isOpen) => {
  if (isOpen && logsContainer.value) {
    await nextTick()
    logsContainer.value.scrollTop = 0
  }
})

const handleCopyLogs = async () => {
  const result = await copyLogs()
  
  if (result.success) {
    toast.add({
      severity: 'success',
      summary: 'Éxito',
      detail: `Registros copiados al portapapeles (método ${result.method})`,
      life: 3000
    })
  } else {
    toast.add({
      severity: 'warn',
      summary: 'Error al Copiar',
      detail: 'No se pudo copiar automáticamente. Revisa la consola para más detalles.',
      life: 5000
    })
  }
}

const handleClearLogs = () => {
  clearLogs()
  toast.add({
    severity: 'info',
    summary: 'Registros Limpiados',
    detail: 'Todos los registros de depuración han sido limpiados',
    life: 2000
  })
}

const handleExportLogs = () => {
  exportLogs()
  toast.add({
    severity: 'success',
    summary: 'Exportación Iniciada',
    detail: 'Los registros se están descargando como archivo de texto',
    life: 3000
  })
}
</script>

<style scoped>
.debug-floating-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.debug-toggle-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 2px solid var(--primary-color);
}

.debug-panel {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 400px;
  max-width: 90vw;
  height: 500px;
  max-height: 70vh;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.debug-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.debug-controls {
  display: flex;
  gap: 8px;
}

.debug-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.log-count {
  font-weight: 500;
  color: #374151;
}

.capture-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #fef3c7;
  color: #92400e;
}

.capture-status.active {
  background: #d1fae5;
  color: #065f46;
}

.debug-logs {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-entry {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 6px;
  border-left: 3px solid #d1d5db;
  background: #f9fafb;
}

.log-entry.log {
  border-left-color: #3b82f6;
}

.log-entry.warn {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.log-entry.error {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.log-entry.info {
  border-left-color: #10b981;
}

.log-entry.debug {
  border-left-color: #8b5cf6;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.log-timestamp {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
}

.log-level {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #e5e7eb;
  color: #374151;
}

.log-entry.log .log-level {
  background: #dbeafe;
  color: #1e40af;
}

.log-entry.warn .log-level {
  background: #fef3c7;
  color: #92400e;
}

.log-entry.error .log-level {
  background: #fee2e2;
  color: #991b1b;
}

.log-entry.info .log-level {
  background: #d1fae5;
  color: #065f46;
}

.log-entry.debug .log-level {
  background: #ede9fe;
  color: #5b21b6;
}

.log-message {
  font-size: 0.875rem;
  color: #374151;
  word-break: break-word;
  margin-bottom: 4px;
}

.log-data {
  margin-top: 4px;
}

.log-data pre {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.no-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
  gap: 8px;
}

.no-logs i {
  font-size: 2rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .debug-panel {
    width: 350px;
    height: 400px;
  }
  
  .debug-floating-button {
    bottom: 15px;
    right: 15px;
  }
  
  .debug-toggle-btn {
    width: 45px;
    height: 45px;
  }
}

@media (max-width: 480px) {
  .debug-panel {
    width: calc(100vw - 30px);
    right: -15px;
  }
}
</style>
