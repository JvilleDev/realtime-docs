<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="sm"
            @click="$router.push('/')"
            class="p-2"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
          </Button>
          <h1 class="text-xl font-semibold text-gray-900">{{ document?.title || 'Documento sin título' }}</h1>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Save Status Indicator -->
          <div v-if="!isGuest" class="flex items-center gap-2">
            <div 
              class="flex items-center gap-2 px-3 py-2 rounded-lg border"
              :class="{
                'border-blue-200 bg-blue-50': saveStatus === 'pending',
                'border-yellow-200 bg-yellow-50': saveStatus === 'saving',
                'border-green-200 bg-green-50': saveStatus === 'saved',
                'border-red-200 bg-red-50': saveStatus === 'error',
                'border-gray-200 bg-gray-50': saveStatus === 'idle'
              }"
            >
              <Icon 
                :name="saveStatus === 'pending' ? 'heroicons:pencil' : 
                       saveStatus === 'saving' ? 'heroicons:arrow-path' : 
                       saveStatus === 'saved' ? 'heroicons:check-circle' : 
                       saveStatus === 'error' ? 'heroicons:exclamation-triangle' : 
                       'heroicons:circle'"
                :class="{
                  'animate-spin': saveStatus === 'saving',
                  'text-blue-500': saveStatus === 'pending',
                  'text-green-500': saveStatus === 'saved',
                  'text-red-500': saveStatus === 'error',
                  'text-gray-400': saveStatus === 'idle'
                }"
                class="w-4 h-4"
              />
              <span class="text-sm font-medium">
                <template v-if="saveStatus === 'pending'">Guardando en {{ Math.ceil((100 - debounceProgress) * 0.02) }}s...</template>
                <template v-else-if="saveStatus === 'saving'">Guardando...</template>
                <template v-else-if="saveStatus === 'saved'">Guardado {{ formatLastSaved() }}</template>
                <template v-else-if="saveStatus === 'error'">Error al guardar</template>
                <template v-else>Guardado</template>
              </span>
              
              <!-- Progress Bar -->
              <div v-if="saveStatus === 'pending'" class="w-16">
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    class="bg-blue-500 h-1 rounded-full transition-all duration-100"
                    :style="{ width: `${debounceProgress}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">            
            <template v-if="!isGuest">
              <Button
                :variant="document?.is_published ? 'secondary' : 'default'"
                @click="togglePublish"
                class="mr-2"
              >
                <Icon :name="document?.is_published ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4 mr-2" />
                {{ document?.is_published ? 'Despublicar' : 'Publicar' }}
              </Button>
              
              <Button
                variant="outline"
                @click="showEditDialog = true"
                class="mr-2"
              >
                <Icon name="heroicons:pencil" class="w-4 h-4 mr-2" />
                Editar
              </Button>
              
              <Button
                @click="showShareDialog = true"
                class="mr-2"
              >
                <Icon name="heroicons:share" class="w-4 h-4 mr-2" />
                Compartir
              </Button>
              
              <Button
                variant="destructive"
                @click="showDeleteConfirm = true"
              >
                <Icon name="heroicons:trash" class="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 p-4">
      <SocketIOEditor
        :document-id="documentId"
        :initial-content="parseDocumentContent(document?.content)"
        :value="parseDocumentContent(document?.content)"
        :is-guest="isGuest"
        @content-change="handleContentChange"
      />
    </div>

    <!-- Share Dialog -->
    <Dialog v-model:open="showShareDialog">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Compartir Documento</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div v-if="document?.is_published" class="space-y-2">
            <label class="block text-sm font-medium">Enlace de Invitado</label>
            <div class="flex gap-2">
              <Input 
                :value="guestLink" 
                readonly 
                class="flex-1"
              />
              <Button 
                variant="outline"
                @click="copyToClipboard(guestLink)"
              >
                <Icon name="heroicons:clipboard" class="w-4 h-4" />
              </Button>
            </div>
            <p class="text-sm text-gray-600">
              Cualquiera con este enlace puede ver el documento
            </p>
          </div>
          
          <div v-else>
            <Alert>
              <Icon name="heroicons:information-circle" class="w-4 h-4" />
              <AlertDescription>
                Publica este documento para generar un enlace compartible
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Edit Document Dialog -->
    <Dialog v-model:open="showEditDialog">
      <DialogContent class="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Editar Documento</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleEditDocument" class="space-y-4">
          <div class="space-y-2">
            <label for="editDocumentTitle" class="text-sm font-medium flex items-center">
              <Icon name="heroicons:document-text" class="w-4 h-4 mr-2" />
              Título del Documento
            </label>
            <Input
              id="editDocumentTitle"
              v-model="editDocumentForm.title"
              placeholder="Ingresa el título del documento"
              :class="{ 'border-red-500': editErrors.title }"
              required
              autofocus
            />
            <small v-if="editErrors.title" class="text-red-500">{{ editErrors.title }}</small>
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium flex items-center">
              <Icon name="heroicons:eye" class="w-4 h-4 mr-2" />
              Estado de Publicación
            </label>
            <div class="flex items-center space-x-2">
              <Checkbox
                v-model:checked="editDocumentForm.is_published"
                id="published"
              />
              <label for="published" class="text-sm font-medium">Documento público</label>
            </div>
            <small class="text-xs text-gray-500">Los documentos públicos pueden ser vistos por cualquier persona con el enlace</small>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="showEditDialog = false"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              :disabled="editingDocument"
            >
              <Icon name="heroicons:check" class="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
        
        <Alert v-if="editError" variant="destructive" class="mt-3">
          <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
          <AlertDescription>{{ editError }}</AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Confirmar Eliminación</DialogTitle>
        </DialogHeader>
        <div class="text-center space-y-4">
          <div>
            <Icon name="heroicons:exclamation-triangle" class="w-16 h-16 text-red-500 mx-auto" />
          </div>
          
          <h3 class="text-xl font-semibold text-gray-900">Eliminar Documento</h3>
          
          <p class="text-gray-600">
            ¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.
          </p>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-center text-gray-700">
              <Icon name="heroicons:document-text" class="w-4 h-4 mr-2" />
              {{ document?.title || 'Documento sin título' }}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              @click="showDeleteConfirm = false"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              :disabled="deletingDocument"
              @click="handleDeleteDocument"
            >
              <Icon name="heroicons:trash" class="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import SocketIOEditor from '~/components/SocketIOEditor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
