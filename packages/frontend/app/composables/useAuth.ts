interface User {
  id: number
  username: string
  display_name: string
  avatar_color: string
  is_admin: boolean
}

export const useAuth = () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  
  const config = useRuntimeConfig()
  
  // Initialize auth state from localStorage
  onMounted(() => {
    if (process.client) {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')
      
      if (storedToken && storedUser) {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      }
    }
  })
  
  const login = async (username: string, password: string) => {
    loading.value = true
    
    try {
      const response = await $fetch(`${config.public.backendUrl}/api/auth/login`, {
        method: 'POST',
        body: { username, password }
      })
      
      token.value = response.token
      user.value = response.user
      
      if (process.client) {
        localStorage.setItem('auth_token', response.token)
        localStorage.setItem('auth_user', JSON.stringify(response.user))
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.data?.error || 'Login failed' 
      }
    } finally {
      loading.value = false
    }
  }
  
  const logout = async () => {
    loading.value = true
    
    try {
      if (token.value) {
        await $fetch(`${config.public.backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`
          },
          body: { token: token.value }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      token.value = null
      user.value = null
      
      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
      
      loading.value = false
      
      // Navigate to login page
      await navigateTo('/login')
    }
  }
  
  const verifyToken = async () => {
    if (!token.value) return false
    
    try {
      const response = await $fetch(`${config.public.backendUrl}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      
      user.value = response.user
      
      if (process.client) {
        localStorage.setItem('auth_user', JSON.stringify(response.user))
      }
      
      return true
    } catch (error) {
      console.error('Token verification failed:', error)
      await logout()
      return false
    }
  }
  
  const updateProfile = async (displayName: string, avatarColor: string) => {
    if (!token.value) return { success: false, error: 'Not authenticated' }
    
    try {
      await $fetch(`${config.public.backendUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.value}`
        },
        body: { display_name: displayName, avatar_color: avatarColor }
      })
      
      if (user.value) {
        user.value.display_name = displayName
        user.value.avatar_color = avatarColor
        
        if (process.client) {
          localStorage.setItem('auth_user', JSON.stringify(user.value))
        }
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Profile update error:', error)
      return { 
        success: false, 
        error: error.data?.error || 'Profile update failed' 
      }
    }
  }
  
  const createUser = async (username: string, password: string, displayName: string, avatarColor?: string) => {
    if (!token.value) return { success: false, error: 'Not authenticated' }
    
    try {
      await $fetch(`${config.public.backendUrl}/api/auth/create-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`
        },
        body: { 
          username, 
          password, 
          display_name: displayName, 
          avatar_color: avatarColor || '#3B82F6' 
        }
      })
      
      return { success: true }
    } catch (error: any) {
      console.error('Create user error:', error)
      return { 
        success: false, 
        error: error.data?.error || 'User creation failed' 
      }
    }
  }
  
  return {
    user: readonly(user),
    token: readonly(token),
    loading: readonly(loading),
    login,
    logout,
    verifyToken,
    updateProfile,
    createUser
  }
}
