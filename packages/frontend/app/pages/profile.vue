<template>
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="!user" class="loading-state">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      <p class="loading-text">Cargando perfil...</p>
    </div>
    
    <!-- Profile Content -->
    <div v-else class="profile-container">
      <Card class="profile-card">
        <CardHeader>
          <CardTitle>
            <div class="profile-header">
              <Avatar class="mr-3">
                <AvatarFallback :style="{ backgroundColor: user?.avatar_color || '#3B82F6' }">
                  {{ user?.display_name?.charAt(0) || 'U' }}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1>{{ user?.display_name || 'User' }}</h1>
                <p class="text-gray-600">@{{ user?.username || 'username' }}</p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div class="profile-content">
            <!-- Profile Settings -->
            <div class="profile-section">
              <h2>Configuración del Perfil</h2>
              
              <form @submit.prevent="updateProfile" class="profile-form">
                <div class="field">
                  <label for="displayName" class="block text-sm font-medium mb-2">Nombre para mostrar</label>
                  <Input
                    id="displayName"
                    v-model="profileForm.display_name"
                    placeholder="Ingresa el nombre para mostrar"
                    :class="{ 'border-red-500': errors.display_name }"
                    required
                  />
                  <small v-if="errors.display_name" class="text-red-500">{{ errors.display_name }}</small>
                </div>
                
                <div class="field">
                  <label for="avatarColor" class="block text-sm font-medium mb-2">Color del Avatar</label>
                  <div class="color-picker">
                    <Input
                      id="avatarColor"
                      v-model="profileForm.avatar_color"
                      placeholder="#3B82F6"
                      :class="{ 'border-red-500': errors.avatar_color }"
                      required
                    />
                    <div 
                      class="color-preview"
                      :style="{ backgroundColor: profileForm.avatar_color }"
                    ></div>
                  </div>
                  <small v-if="errors.avatar_color" class="text-red-500">{{ errors.avatar_color }}</small>
                </div>
                
                <Button
                  type="submit"
                  :disabled="profileLoading"
                >
                  <Icon name="lucide:save" class="w-4 h-4 mr-2" />
                  Actualizar Perfil
                </Button>
                
                <div v-if="profileError" class="mt-3">
                  <div class="p-3 text-red-600 bg-red-50 border border-red-200 rounded-md">
                    <span>{{ profileError }}</span>
                  </div>
                </div>
                
                <div v-if="profileSuccess" class="mt-3">
                  <div class="p-3 text-green-600 bg-green-50 border border-green-200 rounded-md">
                    <span>¡Perfil actualizado exitosamente!</span>
                  </div>
                </div>
              </form>
            </div>
            
            <!-- Admin Panel -->
            <div v-if="user?.is_admin" class="profile-section">
              <h2>Panel de Administración</h2>
              
              <div class="admin-actions">
                <Button
                  @click="showUserDialog = true"
                  class="mr-2"
                >
                  <Icon name="lucide:users" class="w-4 h-4 mr-2" />
                  Gestionar Usuarios
                </Button>
                <Button
                  @click="showDocumentDialog = true"
                >
                  <Icon name="lucide:file-edit" class="w-4 h-4 mr-2" />
                  Gestionar Documentos
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Create User Dialog -->
    <Dialog 
      v-model:visible="showUserDialog" 
      header="Crear Nuevo Usuario" 
      :modal="true"
      class="responsive-dialog"
    >
      <form @submit.prevent="createUser" class="create-user-form">
        <div class="field">
          <label for="newUsername" class="block text-sm font-medium mb-2">Nombre de usuario</label>
          <InputText
            id="newUsername"
            v-model="userForm.username"
            placeholder="Ingresa el nombre de usuario"
            :class="{ 'p-invalid': userErrors.username }"
            required
          />
          <small v-if="userErrors.username" class="p-error">{{ userErrors.username }}</small>
        </div>
        
        <div class="field">
          <label for="newPassword" class="block text-sm font-medium mb-2">Contraseña</label>
          <InputText
            id="newPassword"
            v-model="userForm.password"
            type="password"
            placeholder="Ingresa la contraseña"
            :class="{ 'p-invalid': userErrors.password }"
            required
          />
          <small v-if="userErrors.password" class="p-error">{{ userErrors.password }}</small>
        </div>
        
        <div class="field">
          <label for="newDisplayName" class="block text-sm font-medium mb-2">Nombre para mostrar</label>
          <InputText
            id="newDisplayName"
            v-model="userForm.display_name"
            placeholder="Ingresa el nombre para mostrar"
            :class="{ 'p-invalid': userErrors.display_name }"
            required
          />
          <small v-if="userErrors.display_name" class="p-error">{{ userErrors.display_name }}</small>
        </div>
        
        <div class="field">
          <label for="newAvatarColor" class="block text-sm font-medium mb-2">Color del Avatar</label>
          <div class="color-picker">
            <InputText
              id="newAvatarColor"
              v-model="userForm.avatar_color"
              placeholder="#3B82F6"
              :class="{ 'p-invalid': userErrors.avatar_color }"
              required
            />
            <div 
              class="color-preview"
              :style="{ backgroundColor: userForm.avatar_color }"
            ></div>
          </div>
          <small v-if="userErrors.avatar_color" class="p-error">{{ userErrors.avatar_color }}</small>
        </div>
        
        <div class="dialog-actions">
          <Button
            type="button"
            label="Cancelar"
            severity="secondary"
            @click="showUserDialog = false"
            class="mr-2"
          />
          <Button
            type="submit"
            label="Crear Usuario"
            icon="pi pi-user-plus"
            :loading="userLoading"
          />
        </div>
        
        <div v-if="userError" class="mt-3">
          <div class="p-message p-message-error">
            <span class="p-message-text">{{ userError }}</span>
          </div>
        </div>
        
        <div v-if="userSuccess" class="mt-3">
          <div class="p-message p-message-success">
            <span class="p-message-text">¡Usuario creado exitosamente!</span>
          </div>
        </div>
      </form>
    </Dialog>

    <!-- Manage Documents Dialog -->
    <Dialog 
      v-model:visible="showDocumentDialog" 
      header="Gestionar Documentos" 
      :modal="true"
      class="responsive-dialog large"
    >
      <div class="document-management">
        <DataTable 
          :value="documents" 
          :loading="documentsLoading"
          paginator 
          :rows="10"
          class="p-datatable-sm responsive-datatable"
          scrollable
          scrollHeight="400px"
        >
          <Column field="title" header="Título" sortable></Column>
          <Column field="owner_name" header="Propietario" sortable>
            <template #body="{ data }">
              <div class="flex align-items-center">
                <Avatar 
                  :label="data.owner_name.charAt(0)" 
                  :style="{ backgroundColor: data.owner_color }"
                  size="small"
                  class="mr-2"
                />
                {{ data.owner_name }}
              </div>
            </template>
          </Column>
          <Column field="is_published" header="Publicado" sortable>
            <template #body="{ data }">
              <Tag 
                :value="data.is_published ? 'Sí' : 'No'"
                :severity="data.is_published ? 'success' : 'secondary'"
              />
            </template>
          </Column>
          <Column field="updated_at" header="Última Actualización" sortable>
            <template #body="{ data }">
              {{ formatDate(data.updated_at) }}
            </template>
          </Column>
          <Column header="Acciones">
            <template #body="{ data }">
              <Button
                icon="pi pi-shield"
                size="small"
                @click="reclaimDocument(data.id)"
                tooltip="Reclamar Documento"
                severity="warning"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { usePageTitleStore } from '~/stores/pageTitle'

const { user, updateProfile: updateUserProfile, createUser: createNewUser, token } = useAuth()
const router = useRouter()
const pageTitleStore = usePageTitleStore()

// Profile form
const profileForm = reactive({
  display_name: '',
  avatar_color: '#3B82F6'
})

const profileErrors = reactive({
  display_name: '',
  avatar_color: ''
})

const profileLoading = ref(false)
const profileError = ref('')
const profileSuccess = ref(false)

// User creation form
const userForm = reactive({
  username: '',
  password: '',
  display_name: '',
  avatar_color: '#3B82F6'
})

const userErrors = reactive({
  username: '',
  password: '',
  display_name: '',
  avatar_color: ''
})

const userLoading = ref(false)
const userError = ref('')
const userSuccess = ref('')

// Dialogs
const showUserDialog = ref(false)
const showDocumentDialog = ref(false)

// Documents management
const documents = ref([])
const documentsLoading = ref(false)

onMounted(() => {
  // Set page title
  pageTitleStore.setTitle('Perfil')
  
  if (user.value) {
    profileForm.display_name = user.value.display_name || ''
    profileForm.avatar_color = user.value.avatar_color || '#3B82F6'
  }
})

const updateProfile = async () => {
  profileLoading.value = true
  profileError.value = ''
  profileSuccess.value = false
  
  // Clear errors
  profileErrors.display_name = ''
  profileErrors.avatar_color = ''
  
  // Validate
  if (!profileForm.display_name.trim()) {
    profileErrors.display_name = 'El nombre para mostrar es requerido'
    profileLoading.value = false
    return
  }
  
  if (!profileForm.avatar_color.match(/^#[0-9A-F]{6}$/i)) {
    profileErrors.avatar_color = 'Por favor ingresa un color hexadecimal válido (ej., #3B82F6)'
    profileLoading.value = false
    return
  }
  
  const result = await updateUserProfile(profileForm.display_name, profileForm.avatar_color)
  
  if (result.success) {
    profileSuccess.value = true
    setTimeout(() => {
      profileSuccess.value = false
    }, 3000)
  } else {
    profileError.value = result.error || 'Error al actualizar el perfil'
  }
  
  profileLoading.value = false
}

const createUser = async () => {
  userLoading.value = true
  userError.value = ''
  userSuccess.value = ''
  
  // Clear errors
  userErrors.username = ''
  userErrors.password = ''
  userErrors.display_name = ''
  userErrors.avatar_color = ''
  
  // Validate
  if (!userForm.username.trim()) {
    userErrors.username = 'El nombre de usuario es requerido'
    userLoading.value = false
    return
  }
  
  if (!userForm.password) {
    userErrors.password = 'La contraseña es requerida'
    userLoading.value = false
    return
  }
  
  if (!userForm.display_name.trim()) {
    userErrors.display_name = 'El nombre para mostrar es requerido'
    userLoading.value = false
    return
  }
  
  if (!userForm.avatar_color.match(/^#[0-9A-F]{6}$/i)) {
    userErrors.avatar_color = 'Por favor ingresa un color hexadecimal válido (ej., #3B82F6)'
    userLoading.value = false
    return
  }
  
  const result = await createNewUser(
    userForm.username,
    userForm.password,
    userForm.display_name,
    userForm.avatar_color
  )
  
  if (result.success) {
    userSuccess.value = 'User created successfully!'
    // Reset form
    userForm.username = ''
    userForm.password = ''
    userForm.display_name = ''
    userForm.avatar_color = '#3B82F6'
    setTimeout(() => {
      showUserDialog.value = false
      userSuccess.value = ''
    }, 2000)
  } else {
    userError.value = result.error || 'Error al crear el usuario'
  }
  
  userLoading.value = false
}

const loadDocuments = async () => {
  documentsLoading.value = true
  
  try {
    const config = useRuntimeConfig()
    documents.value = await $fetch(`${config.public.backendUrl}/api/documents`, {
      headers: {
        Authorization: `Bearer ${token.value}`
      }
    })
  } catch (error) {
    console.error('Error loading documents:', error)
  } finally {
    documentsLoading.value = false
  }
}

const reclaimDocument = async (documentId: number) => {
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.backendUrl}/api/documents/${documentId}/reclaim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`
      }
    })
    
    // Reload documents
    await loadDocuments()
  } catch (error) {
    console.error('Error reclaiming document:', error)
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

// Load documents when dialog opens
watch(showDocumentDialog, (newValue) => {
  if (newValue) {
    loadDocuments()
  }
})

onMounted(async () => {
  await nextTick()
  if (!user.value) {
    await router.push('/login')
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: white !important;
  padding: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

.loading-text {
  margin-top: 1rem;
  color: #6b7280 !important;
  font-size: 1rem;
}

.profile-container {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  background: white !important;
  border: 1px solid #e5e7eb;
}

.profile-header {
  display: flex;
  align-items: center;
}

.profile-header h1 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827 !important;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-section h2 {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827 !important;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
}

.admin-actions {
  display: flex;
  gap: 12px;
}

.create-user-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 1rem;
}

.document-management {
  margin-top: 1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .profile-page {
    padding: 0.75rem;
  }
  
  .profile-container {
    max-width: 100%;
  }
  
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .admin-actions {
    flex-direction: column;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding: 0.5rem;
  }
  
  .profile-header {
    text-align: center;
  }
  
  .profile-header h1 {
    font-size: 1.25rem;
  }
  
  .profile-section h2 {
    font-size: 1rem;
  }
  
  .color-picker {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .admin-actions {
    gap: 8px;
  }
  
  .responsive-datatable {
    font-size: 0.875rem;
  }
}

@media (max-width: 640px) {
  .profile-page {
    padding: 0.25rem;
  }
  
  .profile-container {
    padding: 0;
  }
  
  .profile-card {
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    border: none;
  }
  
  .profile-header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .profile-content {
    padding: 1rem;
  }
  
  .profile-section {
    margin-bottom: 1.5rem;
  }
  
  .profile-form {
    gap: 0.75rem;
  }
  
  .field {
    margin-bottom: 0.5rem;
  }
  
  .color-picker {
    gap: 0.5rem;
  }
  
  .color-preview {
    width: 24px;
    height: 24px;
  }
  
  .admin-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .create-user-form {
    gap: 0.75rem;
  }
  
  .dialog-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .responsive-dialog {
    margin: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
  }
  
  .responsive-datatable {
    font-size: 0.75rem;
  }
  
  .responsive-datatable .p-datatable-thead > tr > th {
    padding: 0.5rem 0.25rem;
    font-size: 0.75rem;
  }
  
  .responsive-datatable .p-datatable-tbody > tr > td {
    padding: 0.5rem 0.25rem;
    font-size: 0.75rem;
  }
}

/* Responsive Dialog Styles */
.responsive-dialog {
  width: 500px;
  max-width: 90vw;
}

.responsive-dialog.large {
  width: 800px;
}

@media (max-width: 640px) {
  .responsive-dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
  }
}
</style>
