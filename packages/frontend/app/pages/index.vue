<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-0">
    <!-- Header Section -->
    <div class="bg-white border-b border-slate-200 py-8 mb-8 lg:py-6 md:py-6 sm:py-4">
      <div class="max-w-7xl mx-auto px-6 lg:px-4 md:px-4 sm:px-3 flex justify-between items-center lg:flex-col lg:items-start lg:gap-6">
        <div class="flex-1">
          <h1 class="m-0 mb-2 text-4xl lg:text-3xl md:text-3xl sm:text-2xl font-bold text-slate-800 flex items-center">
            <Icon name="heroicons:folder-open" class="text-primary mr-3" />
            {{ user ? 'Mis Documentos' : 'Documentos Públicos' }}
          </h1>
          <p class="m-0 text-lg md:text-base font-normal text-slate-500">
            {{ user ? 'Gestiona y colabora en tus documentos' : 'Explora documentos compartidos públicamente' }}
          </p>
        </div>
        
        <div class="flex items-center gap-8 lg:w-full lg:justify-between md:gap-4">
          <div class="flex gap-6 md:gap-4">
            <div class="text-center">
              <span class="block text-3xl md:text-2xl font-bold text-blue-600 leading-none">{{ documents.length }}</span>
              <span class="block text-sm text-slate-500 mt-1">Documentos</span>
            </div>
            <div class="text-center">
              <span class="block text-3xl md:text-2xl font-bold text-blue-600 leading-none">{{ publishedCount }}</span>
              <span class="block text-sm text-slate-500 mt-1">Publicados</span>
            </div>
          </div>
          
          <Button
            v-if="user"
            @click="createDocument"
            :disabled="creatingDocument"
            class="px-6 py-3 text-base font-semibold"
          >
            <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
            Nuevo Documento
          </Button>
        </div>
      </div>
    </div>

    <!-- Controls Section -->
    <div class="max-w-7xl mx-auto mb-8 px-6 lg:px-4 md:px-4 sm:px-3 flex justify-between items-center gap-4 lg:flex-col lg:items-stretch lg:gap-4">
      <div class="flex-1">
        <div class="relative max-w-md lg:max-w-none">
          <Icon name="heroicons:magnifying-glass" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg" />
          <Input
            v-model="searchQuery"
            placeholder="Buscar documentos..."
            class="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl text-base bg-white transition-all duration-200 focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
          />
        </div>
      </div>
      
      <div class="flex items-center gap-4 lg:justify-between">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-slate-600">Ordenar por:</label>
          <Select v-model="sortBy">
            <SelectTrigger class="min-w-[180px]">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div class="flex items-center">
          <Button
            :variant="currentLayout === 'grid' ? 'default' : 'outline'"
            @click="toggleLayout"
            class="w-10 h-10 rounded-lg"
          >
            <Icon :name="currentLayout === 'grid' ? 'heroicons:squares-2x2' : 'heroicons:list-bullet'" class="w-4 h-4" />
          </Button>
        </div>
        
        <div v-if="user && selectedDocuments.length > 0" class="flex items-center gap-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
          <Button
            variant="destructive"
            @click="showDeleteConfirm = true"
            class="text-sm"
          >
            <Icon name="heroicons:trash" class="w-4 h-4 mr-2" />
            Eliminar Seleccionados
          </Button>
          <span class="text-sm text-red-600 font-medium">{{ selectedDocuments.length }} seleccionados</span>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
        <p class="mt-4 text-lg text-slate-500 font-medium">Cargando documentos...</p>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="filteredDocuments.length === 0" class="flex justify-center items-center min-h-[500px]">
      <div class="text-center max-w-md">
        <div class="mb-6">
          <Icon name="heroicons:document-text" class="text-8xl text-gray-300" />
        </div>
        <h3 class="m-0 mb-4 text-2xl font-semibold text-slate-800">
          {{ searchQuery ? 'No se encontraron documentos' : (user ? 'Aún no tienes documentos' : 'No hay documentos públicos') }}
        </h3>
        <p class="m-0 mb-8 text-base text-slate-500 leading-relaxed">
          {{ searchQuery ? 'Intenta con otros términos de búsqueda' : (user ? '¡Crea tu primer documento para comenzar!' : 'Vuelve más tarde para ver contenido publicado.') }}
        </p>
        <div class="flex justify-center gap-4">
          <Button
            v-if="user && !searchQuery"
            @click="createDocument"
            class="px-8 py-3 text-base font-semibold"
          >
            <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
            Crear Documento
          </Button>
          <Button
            v-if="searchQuery"
            variant="outline"
            @click="searchQuery = ''"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4 mr-2" />
            Limpiar búsqueda
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Documents Content -->
    <div v-else class="max-w-7xl mx-auto px-6 lg:px-4 md:px-4 sm:px-3">
      <!-- Grid Layout -->
      <div v-if="currentLayout === 'grid'" class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:grid-cols-1 gap-6 md:gap-4">
        <div 
          v-for="document in filteredDocuments" 
          :key="document.id"
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-blue-500"
          :class="{ 'border-blue-500 bg-blue-50': selectedDocuments.includes(document.id) }"
        >
          <div class="p-6 pb-4 lg:p-4 lg:pb-3 md:p-4 md:pb-3 flex justify-between items-start relative">
            <div class="absolute top-4 left-4 lg:top-3 lg:left-3 md:top-3 md:left-3 z-10">
              <Checkbox
                v-if="user"
                :checked="selectedDocuments.includes(document.id)"
                @update:checked="toggleDocumentSelection(document.id)"
                @click.stop
                class="bg-white rounded shadow-sm"
              />
            </div>
            <div class="w-12 h-12 lg:w-10 lg:h-10 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white text-xl lg:text-lg md:text-lg cursor-pointer" @click="openDocument(document.id)">
              <Icon name="heroicons:document-text" />
            </div>
            <div class="mt-1">
              <Badge 
                v-if="document.is_published"
                variant="default"
                class="text-xs font-semibold"
              >
                <Icon name="heroicons:eye" class="w-3 h-3 mr-1" />
                Publicado
              </Badge>
              <Badge 
                v-else
                variant="secondary"
                class="text-xs font-semibold"
              >
                <Icon name="heroicons:lock-closed" class="w-3 h-3 mr-1" />
                Privado
              </Badge>
            </div>
          </div>
          
          <div class="px-6 pb-4 lg:px-4 lg:pb-3 md:px-4 md:pb-3">
            <h3 class="m-0 mb-2 text-lg lg:text-base md:text-base font-semibold text-slate-800 leading-snug">{{ document.title }}</h3>
            <p class="m-0 text-sm text-slate-500 leading-relaxed">{{ document.title }}</p>
          </div>
          
          <div class="px-6 pb-6 pt-4 lg:px-4 lg:pb-4 lg:pt-3 md:px-4 md:pb-4 md:pt-3 border-t border-slate-100">
            <div class="mb-4">
              <div class="flex items-center gap-2 mb-2">
                <Avatar size="small">
                  <AvatarFallback :style="{ backgroundColor: document.owner_color }">
                    {{ document.owner_name.charAt(0) }}
                  </AvatarFallback>
                </Avatar>
                <span class="text-sm font-medium text-slate-600">{{ document.owner_name }}</span>
              </div>
              
              <div class="flex items-center gap-1 text-xs text-slate-400">
                <Icon name="heroicons:clock" class="w-3 h-3" />
                <span>{{ formatDate(document.updated_at) }}</span>
              </div>
            </div>
            
            <div class="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                @click.stop="openDocument(document.id)"
                class="flex-1 p-2 rounded-lg"
              >
                <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
              </Button>
              
              <Button
                v-if="user"
                variant="ghost"
                size="sm"
                @click.stop="editDocument(document)"
                class="flex-1 p-2 rounded-lg"
              >
                <Icon name="heroicons:pencil" class="w-4 h-4" />
              </Button>
              
              <Button
                v-if="user && document.is_published"
                variant="ghost"
                size="sm"
                @click.stop="shareDocument(document.id)"
                class="flex-1 p-2 rounded-lg"
              >
                <Icon name="heroicons:share" class="w-4 h-4" />
              </Button>
              
              <Button
                v-if="user"
                variant="ghost"
                size="sm"
                @click.stop="deleteDocument(document)"
                class="flex-1 p-2 rounded-lg"
              >
                <Icon name="heroicons:trash" class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- List Layout -->
      <div v-else class="flex flex-col gap-3">
        <div 
          v-for="document in filteredDocuments" 
          :key="document.id"
          class="bg-white rounded-xl border border-slate-200 px-6 py-4 cursor-pointer transition-all duration-200 flex items-center gap-4 hover:border-blue-500 hover:shadow-md"
          :class="{ 'border-blue-500 bg-blue-50': selectedDocuments.includes(document.id) }"
        >
          <div class="flex-shrink-0 mr-2">
            <Checkbox
              v-if="user"
              :checked="selectedDocuments.includes(document.id)"
              @update:checked="toggleDocumentSelection(document.id)"
              @click.stop
            />
          </div>
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white text-base flex-shrink-0 cursor-pointer" @click="openDocument(document.id)">
            <Icon name="heroicons:document-text" />
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-2 lg:flex-col lg:items-start lg:gap-2">
              <h3 class="m-0 text-base lg:text-sm md:text-sm font-semibold text-slate-800 leading-snug">{{ document.title }}</h3>
              <div>
                <Badge 
                  v-if="document.is_published"
                  variant="default"
                >
                  <Icon name="heroicons:eye" class="w-3 h-3 mr-1" />
                  Publicado
                </Badge>
                <Badge 
                  v-else
                  variant="secondary"
                >
                  <Icon name="heroicons:lock-closed" class="w-3 h-3 mr-1" />
                  Privado
                </Badge>
              </div>
            </div>
            
            <div class="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Avatar size="small">
                  <AvatarFallback :style="{ backgroundColor: document.owner_color }">
                    {{ document.owner_name.charAt(0) }}
                  </AvatarFallback>
                </Avatar>
                <span>{{ document.owner_name }}</span>
              </div>
              
              <div class="flex items-center gap-1 text-xs text-slate-400">
                <Icon name="heroicons:clock" class="w-3 h-3" />
                <span>{{ formatDate(document.updated_at) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              @click.stop="openDocument(document.id)"
            >
              <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
            </Button>
            
            <Button
              v-if="user"
              variant="ghost"
              size="sm"
              @click.stop="editDocument(document)"
            >
              <Icon name="heroicons:pencil" class="w-4 h-4" />
            </Button>
            
            <Button
              v-if="user && document.is_published"
              variant="ghost"
              size="sm"
              @click.stop="shareDocument(document.id)"
            >
              <Icon name="heroicons:share" class="w-4 h-4" />
            </Button>
            
            <Button
              v-if="user"
              variant="ghost"
              size="sm"
              @click.stop="deleteDocument(document)"
            >
              <Icon name="heroicons:trash" class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Document Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Documento</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleCreateDocument" class="flex flex-col gap-6">
          <div class="flex flex-col">
            <label for="documentTitle" class="font-semibold text-gray-700 mb-2 flex items-center text-sm">
              <Icon name="heroicons:document-text" class="w-4 h-4 mr-2" />
              Título del Documento
            </label>
            <Input
              id="documentTitle"
              v-model="newDocument.title"
              placeholder="Ingresa el título del documento"
              :class="{ 'border-red-500': createErrors.title }"
              required
              autofocus
            />
            <small v-if="createErrors.title" class="text-red-500">{{ createErrors.title }}</small>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="showCreateDialog = false"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              :disabled="creatingDocument"
            >
              Crear Documento
            </Button>
          </DialogFooter>
        </form>
        
        <Alert v-if="createError" variant="destructive" class="mt-3">
          <AlertDescription>{{ createError }}</AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>

    <!-- Edit Document Dialog -->
    <Dialog v-model:open="showEditDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Documento</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleEditDocument" class="flex flex-col gap-6">
          <div class="flex flex-col">
            <label for="editDocumentTitle" class="font-semibold text-gray-700 mb-2 flex items-center text-sm">
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
          
          <div class="flex flex-col">
            <label class="font-semibold text-gray-700 mb-2 flex items-center text-sm">
              <Icon name="heroicons:eye" class="w-4 h-4 mr-2" />
              Estado de Publicación
            </label>
            <div class="flex items-center gap-2 mb-2">
              <Checkbox
                v-model:checked="editDocumentForm.is_published"
                id="published"
              />
              <label for="published" class="text-sm text-gray-700 font-medium">Documento público</label>
            </div>
            <small class="text-xs text-gray-500 mt-1">Los documentos públicos pueden ser vistos por cualquier persona con el enlace</small>
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
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
        
        <Alert v-if="editError" variant="destructive" class="mt-3">
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
        <div class="text-center">
          <div class="mb-4">
            <Icon name="heroicons:exclamation-triangle" class="w-16 h-16 text-red-500" />
          </div>
          
          <h3 class="m-0 mb-4 text-xl font-semibold text-slate-800">
            {{ selectedDocuments.length > 1 ? 'Eliminar Documentos' : 'Eliminar Documento' }}
          </h3>
          
          <p class="m-0 mb-6 text-slate-500 leading-relaxed">
            {{ selectedDocuments.length > 1 
              ? `¿Estás seguro de que quieres eliminar ${selectedDocuments.length} documentos? Esta acción no se puede deshacer.`
              : '¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.'
            }}
          </p>
          
          <div v-if="selectedDocuments.length > 1" class="bg-slate-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
            <div v-for="docId in selectedDocuments" :key="docId" class="flex items-center py-2 text-sm text-gray-700 border-b border-slate-200 last:border-b-0">
              <Icon name="heroicons:document-text" class="w-4 h-4 mr-2" />
              {{ documents.find((d: Document) => d.id === docId)?.title || 'Documento' }}
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
              :disabled="deletingDocuments"
              @click="handleDeleteDocuments"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Document {
  id: number
  title: string
  owner_name: string
  owner_color: string
  is_published: boolean
  updated_at: string
}

const { user, logout, token } = useAuth()
const router = useRouter()

const documents = ref<Document[]>([])
const loading = ref(true)
const creatingDocument = ref(false)
const editingDocument = ref(false)
const deletingDocuments = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteConfirm = ref(false)

// New functionality
const searchQuery = ref('')
const sortBy = ref('updated_at')
const currentLayout = ref('grid')
const selectedDocuments = ref<number[]>([])

const newDocument = reactive({
  title: ''
})

const editDocumentForm = reactive({
  id: null as number | null,
  title: '',
  is_published: false
})

const createErrors = reactive({
  title: ''
})

const editErrors = reactive({
  title: ''
})

const createError = ref('')
const editError = ref('')

// Sort options
const sortOptions = [
  { label: 'Última actualización', value: 'updated_at' },
  { label: 'Título (A-Z)', value: 'title_asc' },
  { label: 'Título (Z-A)', value: 'title_desc' },
  { label: 'Propietario', value: 'owner_name' },
  { label: 'Estado', value: 'is_published' }
]

// Computed properties
const publishedCount = computed(() => {
  return documents.value.filter(doc => doc.is_published).length
})

const filteredDocuments = computed(() => {
  let filtered = documents.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.owner_name.toLowerCase().includes(query)
    )
  }

  // Apply sorting
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'title_asc':
        return a.title.localeCompare(b.title)
      case 'title_desc':
        return b.title.localeCompare(a.title)
      case 'owner_name':
        return a.owner_name.localeCompare(b.owner_name)
      case 'is_published':
        return Number(b.is_published) - Number(a.is_published)
      case 'updated_at':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  return filtered
})

// Methods
const toggleLayout = () => {
  currentLayout.value = currentLayout.value === 'grid' ? 'list' : 'grid'
}

const toggleDocumentSelection = (documentId: number) => {
  const index = selectedDocuments.value.indexOf(documentId)
  if (index > -1) {
    selectedDocuments.value.splice(index, 1)
  } else {
    selectedDocuments.value.push(documentId)
  }
}

onMounted(async () => {
  await loadDocuments()
})

const loadDocuments = async () => {
  loading.value = true
  
  try {
    const config = useRuntimeConfig()
    
    if (user.value) {
      // Load user's documents
      documents.value = await $fetch<Document[]>(`${config.public.backendUrl}/api/documents`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
    } else {
      // Load published documents for guests
      documents.value = await $fetch<Document[]>(`${config.public.backendUrl}/api/documents/published`)
    }
  } catch (error) {
    console.error('Error loading documents:', error)
  } finally {
    loading.value = false
  }
}

const createDocument = () => {
  if (!user.value) {
    router.push('/login')
    return
  }
  
  showCreateDialog.value = true
  newDocument.title = ''
  createError.value = ''
  createErrors.title = ''
}

const handleCreateDocument = async () => {
  creatingDocument.value = true
  createError.value = ''
  createErrors.title = ''
  
  if (!newDocument.title.trim()) {
    createErrors.title = 'El título es requerido'
    creatingDocument.value = false
    return
  }
  
  try {
    const config = useRuntimeConfig()
    const result = await $fetch(`${config.public.backendUrl}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`
      },
      body: { title: newDocument.title }
    }) as { id: number }
    
    showCreateDialog.value = false
    await router.push(`/document/${result.id}`)
  } catch (error: any) {
    console.error('Error creating document:', error)
    createError.value = error.data?.error || 'Error al crear el documento'
  } finally {
    creatingDocument.value = false
  }
}

const openDocument = (documentId: number) => {
  if (user.value) {
    // Usuario autenticado - acceso normal
    router.push(`/document/${documentId}`)
  } else {
    // Guest - acceso como invitado a documento publicado
    router.push(`/document/${documentId}?guest=true`)
  }
}

const shareDocument = (documentId: number) => {
  const shareUrl = `${window.location.origin}/document/${documentId}?guest=true`
  navigator.clipboard.writeText(shareUrl)
}

const editDocument = (document: Document) => {
  editDocumentForm.id = document.id
  editDocumentForm.title = document.title
  editDocumentForm.is_published = document.is_published
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
    await $fetch(`${config.public.backendUrl}/api/documents/${editDocumentForm.id}`, {
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
    const docIndex = documents.value.findIndex(d => d.id === editDocumentForm.id)
    if (docIndex !== -1 && editDocumentForm.id !== null && documents.value[docIndex]) {
      documents.value[docIndex].title = editDocumentForm.title
      documents.value[docIndex].is_published = editDocumentForm.is_published
    }
    
    showEditDialog.value = false
  } catch (error: any) {
    console.error('Error editing document:', error)
    editError.value = error.data?.error || 'Error al editar el documento'
  } finally {
    editingDocument.value = false
  }
}

const deleteDocument = (document: Document) => {
  selectedDocuments.value = [document.id]
  showDeleteConfirm.value = true
}

const handleDeleteDocuments = async () => {
  deletingDocuments.value = true
  
  try {
    const config = useRuntimeConfig()
    
    // Delete documents one by one
    for (const docId of selectedDocuments.value) {
      await $fetch(`${config.public.backendUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
    }
    
    // Remove from local array
    documents.value = documents.value.filter(doc => !selectedDocuments.value.includes(doc.id))
    selectedDocuments.value = []
    showDeleteConfirm.value = false
    
  } catch (error: any) {
    console.error('Error deleting documents:', error)
    // Show error message
  } finally {
    deletingDocuments.value = false
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}
</script>
