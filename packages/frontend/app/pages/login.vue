<template>
  <div class="login-page">
    <div class="login-container">
      <Card class="login-card">
        <CardHeader>
          <CardTitle class="login-title">
            RealtimeDocs
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="field">
              <label for="username" class="field-label">Nombre de usuario</label>
              <Input
                id="username"
                v-model="form.username"
                placeholder="Ingresa tu nombre de usuario"
                :class="{ 'border-red-500': errors.username }"
                required
              />
              <small v-if="errors.username" class="text-red-500">{{ errors.username }}</small>
            </div>
            
            <div class="field">
              <label for="password" class="field-label">Contraseña</label>
              <Input
                id="password"
                v-model="form.password"
                type="password"
                placeholder="Ingresa tu contraseña"
                :class="{ 'border-red-500': errors.password }"
                required
              />
              <small v-if="errors.password" class="text-red-500">{{ errors.password }}</small>
            </div>
            
            <Button
              type="submit"
              :disabled="loading"
              class="w-full"
            >
              <Icon name="lucide:log-in" class="w-4 h-4 mr-2" />
              Iniciar sesión
            </Button>
            
            <div v-if="error" class="mt-3">
              <div class="p-3 text-red-600 bg-red-50 border border-red-200 rounded-md">
                <span>{{ error }}</span>
              </div>
            </div>
          </form>
        </CardContent>
        
        <CardFooter>
          <div class="login-footer">
            <p class="text-sm text-gray-600">
              Contacta a tu administrador para acceso a la cuenta
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>

  <!-- Debug Floating Button (Development Only) -->
  <DebugFloatingButton />
</template>

<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import DebugFloatingButton from '~/components/DebugFloatingButton.vue'

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
  
  .login-title {
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
  
  .login-title {
    font-size: 1.125rem;
  }
  
  .login-form {
    gap: 0.5rem;
  }
}
</style>
