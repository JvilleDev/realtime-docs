<template>
  <div class="login-page">
    <div class="login-container">
      <Card class="login-card">
        <template #title>
          <div class="login-title">
            <h1>RealtimeDocs</h1>
          </div>
        </template>
        
        <template #content>
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="field">
              <label for="username" class="field-label">Nombre de usuario</label>
              <InputText
                id="username"
                v-model="form.username"
                placeholder="Ingresa tu nombre de usuario"
                :class="{ 'p-invalid': errors.username }"
                required
              />
              <small v-if="errors.username" class="p-error">{{ errors.username }}</small>
            </div>
            
            <div class="field">
              <label for="password" class="field-label">Contraseña</label>
              <InputText
                id="password"
                v-model="form.password"
                type="password"
                placeholder="Ingresa tu contraseña"
                :class="{ 'p-invalid': errors.password }"
                required
              />
              <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
            </div>
            
            <Button
              type="submit"
              label="Iniciar sesión"
              icon="pi pi-sign-in"
              :loading="loading"
              class="w-full"
            />
            
            <div v-if="error" class="mt-3">
              <div class="p-message p-message-error">
                <span class="p-message-text">{{ error }}</span>
              </div>
            </div>
          </form>
        </template>
        
        <template #footer>
          <div class="login-footer">
            <p class="text-sm text-gray-600">
              Contacta a tu administrador para acceso a la cuenta
            </p>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

definePageMeta({
  layout: false
})

const { login, loading } = useAuth()
const router = useRouter()

const form = reactive({
  username: '',
  password: ''
})

const errors = reactive({
  username: '',
  password: ''
})

const error = ref('')

const validateForm = () => {
  errors.username = ''
  errors.password = ''
  
  if (!form.username.trim()) {
    errors.username = 'El nombre de usuario es requerido'
    return false
  }
  
  if (!form.password) {
    errors.password = 'La contraseña es requerida'
    return false
  }
  
  return true
}

const handleLogin = async () => {
  if (!validateForm()) return
  
  error.value = ''
  
  const result = await login(form.username, form.password)
  
  if (result.success) {
    await router.push('/')
  } else {
    error.value = result.error || 'Error al iniciar sesión'
  }
}

// Redirect if already logged in
onMounted(async () => {
  const { verifyToken } = useAuth()
  const isValid = await verifyToken()
  
  if (isValid) {
    await router.push('/')
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  padding: 1rem;
}

.login-container {
  width: 100%;
  max-width: 360px;
}

.login-card {
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.login-title {
  text-align: center;
  margin-bottom: 1.5rem;
}

.login-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.login-footer {
  text-align: center;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.login-footer p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

/* Responsive Design */
@media (max-width: 640px) {
  .login-page {
    padding: 0.5rem;
  }
  
  .login-container {
    max-width: 100%;
  }
  
  .login-title h1 {
    font-size: 1.25rem;
  }
  
  .login-form {
    gap: 0.75rem;
  }
  
  .field-label {
    font-size: 0.8rem;
  }
  
  .login-footer p {
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0.25rem;
  }
  
  .login-container {
    padding: 0;
  }
  
  .login-card {
    border-radius: 0;
    box-shadow: none;
    border: none;
  }
  
  .login-title h1 {
    font-size: 1.125rem;
  }
  
  .login-form {
    gap: 0.5rem;
  }
}
</style>
