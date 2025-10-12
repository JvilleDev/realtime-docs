<template>
  <div class="document-page">
    <!-- Header -->
    <div class="document-header">
      <div class="header-content">
        <div class="header-left">
          <Button 
            icon="pi pi-arrow-left" 
            text 
            @click="$router.push('/')"
            class="back-button"
          />
          <h1 class="document-title">{{ document?.title || 'Documento sin título' }}</h1>
        </div>
        
        <div class="header-right">
          <!-- Save Status Indicator -->
          <div v-if="!isGuest" class="save-status">
            <div 
              class="save-indicator"
              :class="{
                'pending': saveStatus === 'pending',
                'saving': saveStatus === 'saving',
                'saved': saveStatus === 'saved',
                'error': saveStatus === 'error'
              }"
            >
              <Icon 
                :name="saveStatus === 'pending' ? 'material-symbols:edit' : 
                       saveStatus === 'saving' ? 'material-symbols:sync' : 
                       saveStatus === 'saved' ? 'material-symbols:check-circle' : 
                       saveStatus === 'error' ? 'material-symbols:error' : 
                       'material-symbols:circle'"
                :class="{
                  'animate-spin': saveStatus === 'saving',
                  'text-blue-500': saveStatus === 'pending',
                  'text-green-500': saveStatus === 'saved',
                  'text-red-500': saveStatus === 'error',
                  'text-gray-400': saveStatus === 'idle'
                }"
              />
              <span class="save-text">
                <template v-if="saveStatus === 'pending'">Guardando en {{ Math.ceil((100 - debounceProgress) * 0.02) }}s...</template>
                <template v-else-if="saveStatus === 'saving'">Guardando...</template>
                <template v-else-if="saveStatus === 'saved'">Guardado {{ formatLastSaved() }}</template>
                <template v-else-if="saveStatus === 'error'">Error al guardar</template>
                <template v-else>Guardado</template>
              </span>
              
              <!-- Progress Bar -->
              <div v-if="saveStatus === 'pending'" class="progress-container">
                <div class="progress-bar">
                  <div 
                    class="progress-fill"
                    :style="{ width: `${debounceProgress}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="document-actions">            
            <template v-if="!isGuest">
              <Button
                :label="document?.is_published ? 'Despublicar' : 'Publicar'"
                :icon="document?.is_published ? 'pi pi-eye-slash' : 'pi pi-eye'"
                :severity="document?.is_published ? 'secondary' : 'success'"
                @click="togglePublish"
                class="mr-2"
              />
              
              <Button
                icon="pi pi-pencil"
                label="Editar"
                @click="showEditDialog = true"
                severity="secondary"
                class="mr-2"
              />
              
              <Button
                icon="pi pi-send"
                label="Compartir"
                @click="showShareDialog = true"
                class="mr-2"
              />
              
              <Button
                icon="pi pi-trash"
                label="Eliminar"
                @click="showDeleteConfirm = true"
                severity="danger"
              />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="document-content">
      <SocketIOEditor
        :document-id="documentId"
        :initial-content="parseDocumentContent(document?.content)"
        :value="parseDocumentContent(document?.content)"
        :is-guest="isGuest"
        @content-change="handleContentChange"
      />
    </div>

    <!-- Share Dialog -->
    <Dialog 
      v-model:visible="showShareDialog" 
      header="Compartir Documento" 
      :modal="true"
      class="responsive-dialog"
    >
      <div class="share-content">
        <div v-if="document?.is_published" class="share-link">
          <label class="block text-sm font-medium mb-2">Enlace de Invitado</label>
          <div class="flex gap-2">
            <InputText 
              :value="guestLink" 
              readonly 
              class="flex-1"
            />
            <Button 
              icon="pi pi-copy" 
              @click="copyToClipboard(guestLink)"
              tooltip="Copiar enlace"
            />
          </div>
          <small class="text-gray-600 mt-1 block">
            Cualquiera con este enlace puede ver el documento
          </small>
        </div>
        
        <div v-else class="publish-notice">
          <Message 
            severity="info" 
            :closable="false"
          >
            Publica este documento para generar un enlace compartible
          </Message>
        </div>
      </div>
    </Dialog>

    <!-- Edit Document Dialog -->
    <Dialog 
      v-model:visible="showEditDialog" 
      header="Editar Documento" 
      :modal="true"
      :style="{ width: '450px' }"
      :closable="true"
    >
      <form @submit.prevent="handleEditDocument" class="edit-form">
        <div class="field">
          <label for="editDocumentTitle" class="field-label">
            <i class="pi pi-file-edit mr-2"></i>
            Título del Documento
          </label>
          <InputText
            id="editDocumentTitle"
            v-model="editDocumentForm.title"
            placeholder="Ingresa el título del documento"
            :class="{ 'p-invalid': editErrors.title }"
            required
            autofocus
          />
          <small v-if="editErrors.title" class="p-error">{{ editErrors.title }}</small>
        </div>
        
        <div class="field">
          <label class="field-label">
            <i class="pi pi-eye mr-2"></i>
            Estado de Publicación
          </label>
          <div class="checkbox-field">
            <Checkbox
              v-model="editDocumentForm.is_published"
              :binary="true"
              inputId="published"
            />
            <label for="published" class="checkbox-label">Documento público</label>
          </div>
          <small class="field-help">Los documentos públicos pueden ser vistos por cualquier persona con el enlace</small>
        </div>
        
        <div class="dialog-actions">
          <Button
            type="button"
            label="Cancelar"
            severity="secondary"
            outlined
            @click="showEditDialog = false"
            class="mr-2"
          />
          <Button
            type="submit"
            label="Guardar Cambios"
            icon="pi pi-save"
            :loading="editingDocument"
          />
        </div>
        
        <InlineMessage 
          v-if="editError" 
          severity="error" 
          :closable="false"
          class="mt-3"
        >
          {{ editError }}
        </InlineMessage>
      </form>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog 
      v-model:visible="showDeleteConfirm" 
      header="Confirmar Eliminación" 
      :modal="true"
      :style="{ width: '400px' }"
      :closable="true"
    >
      <div class="delete-confirm-content">
        <div class="delete-icon">
          <i class="pi pi-exclamation-triangle text-6xl text-red-500"></i>
        </div>
        
        <h3 class="delete-title">Eliminar Documento</h3>
        
        <p class="delete-message">
          ¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.
        </p>
        
        <div class="document-info">
          <div class="document-item">
            <i class="pi pi-file-edit mr-2"></i>
            {{ document?.title || 'Documento sin título' }}
          </div>
        </div>
        
        <div class="dialog-actions">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            @click="showDeleteConfirm = false"
            class="mr-2"
          />
          <Button
            label="Eliminar"
            icon="pi pi-trash"
            severity="danger"
            :loading="deletingDocument"
            @click="handleDeleteDocument"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import SocketIOEditor from '~/components/SocketIOEditor.vue'

const route = useRoute()
const router = useRouter()
const { user, token } = useAuth()
const { debouncedSave, flushPendingUpdates, cancelPendingUpdates, getPendingUpdatesCount } = useDebouncedBackendSync()
const { status: saveStatus, formatLastSaved, errorMessage, debounceProgress } = useSaveStatus()

const documentId = route.params.id as string
const isGuest = computed(() => route.query.guest === 'true')

const document = ref<any>(null)
const loading = ref(true)
const showShareDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteConfirm = ref(false)
const showMobileActions = ref(false)

// Edit form
const editDocumentForm = reactive({
  title: '',
  is_published: false
})

const editErrors = reactive({
  title: ''
})

const editingDocument = ref(false)
const deletingDocument = ref(false)
const editError = ref('')

// Watch save status changes for debugging
watch(saveStatus, (newStatus, oldStatus) => {
  console.log('🔄 Save status changed:', { from: oldStatus, to: newStatus })
}, { immediate: true })

const guestLink = computed(() => {
  if (process.client) {
    return `${window.location.origin}/document/${documentId}?guest=true`
  }
  return ''
})

// Helper function to safely parse document content
const parseDocumentContent = (content: any) => {
  if (!content) return null
  
  // If it's already an object, return it
  if (typeof content === 'object') {
    return content
  }
  
  // If it's a string, try to parse it
  if (typeof content === 'string') {
    try {
      return JSON.parse(content)
    } catch (error) {
      console.error('Error parsing document content:', error)
      return null
    }
  }
  
  return null
}

onMounted(async () => {
  // Redirect guests to login if not in guest mode
  if (!isGuest.value && !user.value) {
    await router.push('/login')
    return
  }
  
  await loadDocument()
})

const loadDocument = async () => {
  try {
    const config = useRuntimeConfig()
    
    // Determine if we should access as guest or authenticated user
    const shouldAccessAsGuest = isGuest.value || !token.value || !user.value
    
    const url = shouldAccessAsGuest
      ? `${config.public.backendUrl}/api/documents/${documentId}?guest=true`
      : `${config.public.backendUrl}/api/documents/${documentId}`
    
    const headers: Record<string, string> = shouldAccessAsGuest ? {} : {
      Authorization: `Bearer ${token.value}`
    }
    
    console.log(`📄 Loading document as ${shouldAccessAsGuest ? 'guest' : 'authenticated user'}`)
    
    // Add mobile-friendly timeout and retry configuration
    document.value = await $fetch(url, { 
      headers,
      timeout: 30000, // 30 seconds timeout
      retry: 3,
      retryDelay: 1000
    })
    
    // Log the content type for debugging
    if (document.value?.content) {
      console.log('Document content type:', typeof document.value.content)
    }
  } catch (error) {
    console.error('Error loading document:', error)
    
    // Check if it's a timeout error
    if (error && typeof error === 'object' && 'cause' in error) {
      const cause = (error as any).cause
      if (cause && cause.message && cause.message.includes('Headers Timeout')) {
        console.warn('⏰ Mobile timeout detected, retrying with longer timeout...')
        
        // Retry with longer timeout
        try {
          const config = useRuntimeConfig()
          const shouldAccessAsGuest = isGuest.value || !token.value || !user.value
          const url = shouldAccessAsGuest
            ? `${config.public.backendUrl}/api/documents/${documentId}?guest=true`
            : `${config.public.backendUrl}/api/documents/${documentId}`
          
          const headers: Record<string, string> = shouldAccessAsGuest ? {} : {
            Authorization: `Bearer ${token.value}`
          }
          
          document.value = await $fetch(url, { 
            headers,
            timeout: 60000, // 60 seconds for retry
            retry: 1
          })
          
          console.log('✅ Document load retry successful')
        } catch (retryError) {
          console.error('❌ Document load retry also failed:', retryError)
          await router.push('/')
        }
      } else {
        // If authenticated access failed, try as guest
        if (!isGuest.value && token.value) {
          console.log('🔄 Authenticated access failed, trying as guest...')
          try {
            const config = useRuntimeConfig()
            document.value = await $fetch(`${config.public.backendUrl}/api/documents/${documentId}?guest=true`, {
              timeout: 30000,
              retry: 2
            })
            console.log('✅ Successfully loaded document as guest')
          } catch (guestError) {
            console.error('❌ Guest access also failed:', guestError)
            await router.push('/')
          }
        } else {
          await router.push('/')
        }
      }
    } else {
      // If authenticated access failed, try as guest
      if (!isGuest.value && token.value) {
        console.log('🔄 Authenticated access failed, trying as guest...')
        try {
          const config = useRuntimeConfig()
          document.value = await $fetch(`${config.public.backendUrl}/api/documents/${documentId}?guest=true`, {
            timeout: 30000,
            retry: 2
          })
          console.log('✅ Successfully loaded document as guest')
        } catch (guestError) {
          console.error('❌ Guest access also failed:', guestError)
          await router.push('/')
        }
      } else {
        await router.push('/')
      }
    }
  } finally {
    loading.value = false
  }
}

const handleContentChange = async (content: any) => {
  // Send changes to backend using debounced save
  console.log('🔄 Content change detected:', {
    isGuest: isGuest.value,
    hasContent: !!content,
    hasToken: !!token.value,
    hasUser: !!user.value,
    documentId,
    contentType: typeof content,
    contentKeys: content ? Object.keys(content) : 'no content'
  })
  
  if (!isGuest.value && content && token.value && user.value) {
    console.log('💾 Scheduling backend sync for document:', documentId)
    console.log('📊 Current save status before debouncedSave:', saveStatus.value)
    debouncedSave(documentId, content)
    console.log('📊 Save status after debouncedSave:', saveStatus.value)
  } else {
    console.log('⚠️ Skipping backend sync:', {
      reason: isGuest.value ? 'guest mode' : !content ? 'no content' : !token.value ? 'no token' : 'no user'
    })
  }
}

const togglePublish = async () => {
  if (isGuest.value) return
  
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.backendUrl}/api/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.value}`
      },
      body: { is_published: !document.value.is_published }
    })
    
    document.value.is_published = !document.value.is_published
  } catch (error) {
    console.error('Error toggling publish status:', error)
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // You could show a toast notification here
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

const editDocument = () => {
  if (!document.value) return
  
  editDocumentForm.title = document.value.title
  editDocumentForm.is_published = document.value.is_published
  editError.value = ''
  editErrors.title = ''
  showEditDialog.value = true
}

const handleEditDocument = async () => {
  editingDocument.value = true
  editError.value = ''
  editErrors.title = ''
  
  if (!editDocumentForm.title.trim()) {
    editErrors.title = 'El título es requerido'
    editingDocument.value = false
    return
  }
  
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.backendUrl}/api/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.value}`
      },
      body: { 
        title: editDocumentForm.title,
        is_published: editDocumentForm.is_published
      }
    })
    
    // Update local document
    document.value.title = editDocumentForm.title
    document.value.is_published = editDocumentForm.is_published
    
    showEditDialog.value = false
  } catch (error: any) {
    console.error('Error editing document:', error)
    editError.value = error.data?.error || 'Error al editar el documento'
  } finally {
    editingDocument.value = false
  }
}

const handleDeleteDocument = async () => {
  deletingDocument.value = true
  
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.backendUrl}/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token.value}`
      }
    })
    
    // Redirect to home page
    await router.push('/')
  } catch (error: any) {
    console.error('Error deleting document:', error)
    // Show error message
  } finally {
    deletingDocument.value = false
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

// Redirect guests to login if not in guest mode
// This check is now handled in the main onMounted above

// Clean up when component unmounts
onUnmounted(() => {
  // Flush any pending updates before leaving
  flushPendingUpdates()
})
</script>

<style scoped>
.document-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.document-header {
  background: white !important;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.document-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827 !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.save-status {
  display: flex;
  align-items: center;
}

.save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}

.save-indicator.pending {
  background: #dbeafe;
  color: #1e40af;
}

.save-indicator.saving {
  background: #fef3c7;
  color: #92400e;
}

.save-indicator.saved {
  background: #d1fae5;
  color: #065f46;
}

.save-indicator.error {
  background: #fee2e2;
  color: #991b1b;
}

.save-indicator:not(.pending):not(.saving):not(.saved):not(.error) {
  background: #f3f4f6;
  color: #6b7280;
}

.progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 0 0 6px 6px;
  overflow: hidden;
}

.progress-bar {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.05s ease;
  border-radius: 0 0 6px 6px;
}

.save-text {
  white-space: nowrap;
}

.document-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.document-content {
  flex: 1;
  overflow: hidden;
}

.share-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.share-link {
  display: flex;
  flex-direction: column;
}

.guest-viewing-badge {
  font-size: 0.75rem;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .header-content {
    padding: 8px 16px;
  }
  
  .document-title {
    font-size: 1.125rem;
  }
  
  .header-left {
    gap: 8px;
  }
  
  .header-right {
    gap: 12px;
  }
  
  .save-indicator {
    padding: 4px 8px;
    font-size: 0.8rem;
  }
  
  .save-text {
    display: none; /* Hide text on mobile, show only icon */
  }
  
  .document-actions {
    gap: 4px;
  }
}

@media (max-width: 640px) {
  .header-content {
    padding: 8px 12px;
  }
  
  .document-title {
    font-size: 1rem;
  }
  
  .header-left {
    gap: 6px;
  }
  
  .header-right {
    gap: 8px;
  }
  
  .save-indicator {
    padding: 3px 6px;
    font-size: 0.75rem;
  }
  
  .document-actions {
    gap: 3px;
  }
  
.responsive-dialog {
  margin: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
}

/* Edit Form Styles */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.checkbox-label {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.field-help {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* Delete Confirmation Styles */
.delete-confirm-content {
  text-align: center;
}

.delete-icon {
  margin-bottom: 1rem;
}

.delete-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.delete-message {
  margin: 0 0 1.5rem 0;
  color: #64748b;
  line-height: 1.6;
}

.document-info {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.document-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #374151;
}
}
</style>
