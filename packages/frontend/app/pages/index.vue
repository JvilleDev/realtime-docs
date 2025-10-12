<template>
  <div class="home-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <i class="pi pi-folder-open text-primary mr-3"></i>
            {{ user ? 'Mis Documentos' : 'Documentos Públicos' }}
          </h1>
          <p class="page-subtitle">
            {{ user ? 'Gestiona y colabora en tus documentos' : 'Explora documentos compartidos públicamente' }}
          </p>
        </div>
        
        <div class="header-right">
          <div class="stats-container">
            <div class="stat-item">
              <span class="stat-number">{{ documents.length }}</span>
              <span class="stat-label">Documentos</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ publishedCount }}</span>
              <span class="stat-label">Publicados</span>
            </div>
          </div>
          
          <Button
            v-if="user"
            icon="pi pi-plus"
            label="Nuevo Documento"
            @click="createDocument"
            :loading="creatingDocument"
            class="create-btn"
          />
        </div>
      </div>
    </div>

    <!-- Controls Section -->
    <div class="controls-section">
      <div class="controls-left">
        <div class="search-container">
          <Icon name="material-symbols:search" class="search-icon" />
          <InputText
            v-model="searchQuery"
            placeholder="Buscar documentos..."
            class="search-input"
          />
        </div>
      </div>
      
      <div class="controls-right">
        <div class="sort-container">
          <label class="sort-label">Ordenar por:</label>
          <Dropdown
            v-model="sortBy"
            :options="sortOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar"
            class="sort-dropdown"
          />
        </div>
        
        <div class="layout-toggle">
          <Button
            :icon="currentLayout === 'grid' ? 'pi pi-th-large' : 'pi pi-list'"
            :severity="currentLayout === 'grid' ? 'primary' : 'secondary'"
            @click="toggleLayout"
            v-tooltip="currentLayout === 'grid' ? 'Vista de lista' : 'Vista de cuadrícula'"
            class="layout-btn"
          />
        </div>
        
        <div v-if="user && selectedDocuments.length > 0" class="bulk-actions">
          <Button
            icon="pi pi-trash"
            label="Eliminar Seleccionados"
            severity="danger"
            outlined
            @click="showDeleteConfirm = true"
            class="bulk-delete-btn"
          />
          <span class="selection-count">{{ selectedDocuments.length }} seleccionados</span>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-content">
        <ProgressSpinner 
          style="width: 60px; height: 60px" 
          strokeWidth="3"
          animationDuration="1s"
        />
        <p class="loading-text">Cargando documentos...</p>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="filteredDocuments.length === 0" class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">
          <i class="pi pi-file-edit text-8xl text-surface-300"></i>
        </div>
        <h3 class="empty-title">
          {{ searchQuery ? 'No se encontraron documentos' : (user ? 'Aún no tienes documentos' : 'No hay documentos públicos') }}
        </h3>
        <p class="empty-subtitle">
          {{ searchQuery ? 'Intenta con otros términos de búsqueda' : (user ? '¡Crea tu primer documento para comenzar!' : 'Vuelve más tarde para ver contenido publicado.') }}
        </p>
        <div class="empty-actions">
          <Button
            v-if="user && !searchQuery"
            icon="pi pi-plus"
            label="Crear Documento"
            @click="createDocument"
            class="empty-create-btn"
          />
          <Button
            v-if="searchQuery"
            icon="pi pi-times"
            label="Limpiar búsqueda"
            @click="searchQuery = ''"
            severity="secondary"
            outlined
          />
        </div>
      </div>
    </div>
    
    <!-- Documents Content -->
    <div v-else class="documents-content">
      <!-- Grid Layout -->
      <div v-if="currentLayout === 'grid'" class="documents-grid">
        <div 
          v-for="document in filteredDocuments" 
          :key="document.id"
          class="document-card-grid"
          :class="{ 'selected': selectedDocuments.includes(document.id) }"
        >
          <div class="card-header">
            <div class="card-selection">
              <Checkbox
                v-if="user"
                v-model="selectedDocuments"
                :value="document.id"
                @click.stop
                class="document-checkbox"
              />
            </div>
            <div class="card-icon" @click="openDocument(document.id)">
              <i class="pi pi-file-edit"></i>
            </div>
            <div class="card-status">
              <Tag 
                v-if="document.is_published"
                value="Publicado"
                severity="success"
                icon="pi pi-eye"
                class="status-tag"
              />
              <Tag 
                v-else
                value="Privado"
                severity="secondary"
                icon="pi pi-lock"
                class="status-tag"
              />
            </div>
          </div>
          
          <div class="card-content">
            <h3 class="card-title">{{ document.title }}</h3>
            <p class="card-description">{{ document.title }}</p>
          </div>
          
          <div class="card-footer">
            <div class="card-meta">
              <div class="owner-info">
                <Avatar 
                  :label="document.owner_name.charAt(0)" 
                  :style="{ backgroundColor: document.owner_color }"
                  size="small"
                />
                <span class="owner-name">{{ document.owner_name }}</span>
              </div>
              
              <div class="card-date">
                <i class="pi pi-clock"></i>
                <span>{{ formatDate(document.updated_at) }}</span>
              </div>
            </div>
            
            <div class="card-actions">
              <Button
                icon="pi pi-external-link"
                @click.stop="openDocument(document.id)"
                v-tooltip="'Abrir documento'"
                class="action-btn"
              />
              
              <Button
                v-if="user"
                icon="pi pi-pencil"
                @click.stop="editDocument(document)"
                v-tooltip="'Editar documento'"
                severity="secondary"
                class="action-btn"
              />
              
              <Button
                v-if="user && document.is_published"
                icon="pi pi-send"
                @click.stop="shareDocument(document.id)"
                v-tooltip="'Compartir documento'"
                severity="secondary"
                class="action-btn"
              />
              
              <Button
                v-if="user"
                icon="pi pi-trash"
                @click.stop="deleteDocument(document)"
                v-tooltip="'Eliminar documento'"
                severity="danger"
                class="action-btn"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- List Layout -->
      <div v-else class="documents-list">
        <div 
          v-for="document in filteredDocuments" 
          :key="document.id"
          class="document-card-list"
          :class="{ 'selected': selectedDocuments.includes(document.id) }"
        >
          <div class="list-selection">
            <Checkbox
              v-if="user"
              v-model="selectedDocuments"
              :value="document.id"
              @click.stop
              class="document-checkbox"
            />
          </div>
          <div class="list-icon" @click="openDocument(document.id)">
            <i class="pi pi-file-edit"></i>
          </div>
          
          <div class="list-content">
            <div class="list-header">
              <h3 class="list-title">{{ document.title }}</h3>
              <div class="list-status">
                <Tag 
                  v-if="document.is_published"
                  value="Publicado"
                  severity="success"
                  icon="pi pi-eye"
                />
                <Tag 
                  v-else
                  value="Privado"
                  severity="secondary"
                  icon="pi pi-lock"
                />
              </div>
            </div>
            
            <div class="list-meta">
              <div class="list-owner">
                <Avatar 
                  :label="document.owner_name.charAt(0)" 
                  :style="{ backgroundColor: document.owner_color }"
                  size="small"
                />
                <span>{{ document.owner_name }}</span>
              </div>
              
              <div class="list-date">
                <i class="pi pi-clock"></i>
                <span>{{ formatDate(document.updated_at) }}</span>
              </div>
            </div>
          </div>
          
          <div class="list-actions">
            <Button
              icon="pi pi-external-link"
              @click.stop="openDocument(document.id)"
              v-tooltip="'Abrir documento'"
              size="small"
            />
            
            <Button
              v-if="user"
              icon="pi pi-pencil"
              @click.stop="editDocument(document)"
              v-tooltip="'Editar documento'"
              severity="secondary"
              size="small"
            />
            
            <Button
              v-if="user && document.is_published"
              icon="pi pi-send"
              @click.stop="shareDocument(document.id)"
              v-tooltip="'Compartir documento'"
              severity="secondary"
              size="small"
            />
            
            <Button
              v-if="user"
              icon="pi pi-trash"
              @click.stop="deleteDocument(document)"
              v-tooltip="'Eliminar documento'"
              severity="danger"
              size="small"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Create Document Dialog -->
    <Dialog 
      v-model:visible="showCreateDialog" 
      header="Crear Nuevo Documento" 
      :modal="true"
      :style="{ width: '450px' }"
      :closable="true"
    >
      <form @submit.prevent="handleCreateDocument" class="create-form">
        <div class="field">
          <label for="documentTitle" class="field-label">
            <i class="pi pi-file-edit mr-2"></i>
            Título del Documento
          </label>
          <InputText
            id="documentTitle"
            v-model="newDocument.title"
            placeholder="Ingresa el título del documento"
            :class="{ 'p-invalid': createErrors.title }"
            required
            autofocus
          />
          <small v-if="createErrors.title" class="p-error">{{ createErrors.title }}</small>
        </div>
        
        <div class="dialog-actions">
          <Button
            type="button"
            label="Cancelar"
            severity="secondary"
            outlined
            @click="showCreateDialog = false"
            class="mr-2"
          />
          <Button
            type="submit"
            label="Crear Documento"
            icon="pi pi-plus"
            :loading="creatingDocument"
          />
        </div>
        
        <InlineMessage 
          v-if="createError" 
          severity="error" 
          :closable="false"
          class="mt-3"
        >
          {{ createError }}
        </InlineMessage>
      </form>
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
        
        <h3 class="delete-title">
          {{ selectedDocuments.length > 1 ? 'Eliminar Documentos' : 'Eliminar Documento' }}
        </h3>
        
        <p class="delete-message">
          {{ selectedDocuments.length > 1 
            ? `¿Estás seguro de que quieres eliminar ${selectedDocuments.length} documentos? Esta acción no se puede deshacer.`
            : '¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.'
          }}
        </p>
        
        <div v-if="selectedDocuments.length > 1" class="documents-list">
          <div v-for="docId in selectedDocuments" :key="docId" class="document-item">
            <i class="pi pi-file-edit mr-2"></i>
            {{ documents.find(d => d.id === docId)?.title || 'Documento' }}
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
            :loading="deletingDocuments"
            @click="handleDeleteDocuments"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'

const { user, logout, token } = useAuth()
const router = useRouter()

const documents = ref([])
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
const selectedDocuments = ref([])

const newDocument = reactive({
  title: ''
})

const editDocumentForm = reactive({
  id: null,
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
        return b.is_published - a.is_published
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

onMounted(async () => {
  await loadDocuments()
})

const loadDocuments = async () => {
  loading.value = true
  
  try {
    const config = useRuntimeConfig()
    
    if (user.value) {
      // Load user's documents
      documents.value = await $fetch(`${config.public.backendUrl}/api/documents`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
    } else {
      // Load published documents for guests
      documents.value = await $fetch(`${config.public.backendUrl}/api/documents/published`)
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

const editDocument = (document: any) => {
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
    if (docIndex !== -1) {
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

const deleteDocument = (document: any) => {
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

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 0;
}

/* Header Section */
.page-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 2rem 0;
  margin-bottom: 2rem;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
}

.page-subtitle {
  margin: 0;
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 400;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.stats-container {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.create-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
}

/* Controls Section */
.controls-section {
  max-width: 1200px;
  margin: 0 auto 2rem auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.controls-left {
  flex: 1;
}

.search-container {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.125rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sort-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.sort-dropdown {
  min-width: 180px;
}

.layout-toggle {
  display: flex;
  align-items: center;
}

.layout-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.bulk-delete-btn {
  font-size: 0.875rem;
}

.selection-count {
  font-size: 0.875rem;
  color: #dc2626;
  font-weight: 500;
}

/* Loading State */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.loading-content {
  text-align: center;
}

.loading-text {
  margin-top: 1rem;
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.empty-content {
  text-align: center;
  max-width: 500px;
}

.empty-icon {
  margin-bottom: 1.5rem;
}

.empty-title {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.empty-subtitle {
  margin: 0 0 2rem 0;
  font-size: 1rem;
  color: #64748b;
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.empty-create-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
}

/* Documents Content */
.documents-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Grid Layout */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.document-card-grid {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.document-card-grid:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-color: #3b82f6;
}

.document-card-grid.selected {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.document-card-list.selected {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.card-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-selection {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
}

.document-checkbox {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.list-selection {
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.card-status {
  margin-top: 0.25rem;
}

.status-tag {
  font-size: 0.75rem;
  font-weight: 600;
}

.card-content {
  padding: 0 1.5rem 1rem 1.5rem;
}

.card-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

.card-description {
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
}

.card-footer {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}

.card-meta {
  margin-bottom: 1rem;
}

.owner-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.owner-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.card-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 8px;
}

/* List Layout */
.documents-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.document-card-list {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.document-card-list:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.list-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  flex-shrink: 0;
}

.list-content {
  flex: 1;
  min-width: 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.list-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.list-owner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
}

.list-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.list-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Dialog Styles */
.create-form {
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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* Edit Form Styles */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.documents-list {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.document-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #e2e8f0;
}

.document-item:last-child {
  border-bottom: none;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .header-content {
    padding: 0 1rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .controls-section {
    padding: 0 1rem;
  }
  
  .documents-content {
    padding: 0 1rem;
  }
  
  .documents-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 1.5rem 0;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .stats-container {
    gap: 1rem;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
  
  .controls-section {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .controls-right {
    justify-content: space-between;
  }
  
  .search-container {
    max-width: none;
  }
  
  .documents-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .document-card-list {
    padding: 0.75rem 1rem;
  }
  
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .list-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 640px) {
  .page-header {
    padding: 1rem 0;
  }
  
  .header-content {
    padding: 0 0.75rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .controls-section {
    padding: 0 0.75rem;
  }
  
  .documents-content {
    padding: 0 0.75rem;
  }
  
  .card-header {
    padding: 1rem 1rem 0.75rem 1rem;
  }
  
  .card-content {
    padding: 0 1rem 0.75rem 1rem;
  }
  
  .card-footer {
    padding: 0.75rem 1rem 1rem 1rem;
  }
  
  .card-icon {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .card-title {
    font-size: 1rem;
  }
  
  .list-icon {
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }
  
  .list-title {
    font-size: 0.875rem;
  }
}
</style>
