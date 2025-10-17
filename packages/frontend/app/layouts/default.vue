<template>
  <div class="min-h-screen bg-white flex flex-col overflow-hidden">
    <!-- Minimal Header -->
    <header class="sticky top-0 z-[1000] bg-white border-b border-gray-200 h-14">
      <div class="flex items-center justify-between h-full px-4 max-w-7xl mx-auto w-full lg:px-4 md:px-3">
        <!-- Logo -->
        <div class="flex items-center">
          <span class="text-xl font-semibold text-gray-900 lg:text-lg md:text-lg">RealtimeDocs</span>
        </div>
        
        <!-- Desktop User Actions -->
        <div class="hidden sm:flex items-center gap-3">
          <!-- Guest User -->
          <template v-if="!user">
            <Badge variant="secondary" class="text-xs">
              Invitado
            </Badge>
            <Button 
              size="sm"
              @click="handleNavigation('/login')"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4 mr-2" />
              Iniciar sesión
            </Button>
          </template>
          
          <!-- Authenticated User -->
          <template v-else>
            <Avatar 
              :style="{ backgroundColor: user.avatar_color }"
              class="w-8 h-8 mr-1"
            >
              <AvatarFallback class="text-sm">
                {{ user.display_name.charAt(0) }}
              </AvatarFallback>
            </Avatar>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button 
                    variant="ghost"
                    size="sm"
                    @click="handleNavigation('/profile')"
                    class="p-2"
                  >
                    <Icon name="heroicons:user" class="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Perfil</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button 
                    variant="ghost"
                    size="sm"
                    @click="logout"
                    class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cerrar sesión</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </template>
        </div>

        <!-- Mobile Menu Button -->
        <div class="flex sm:hidden">
          <Button 
            variant="ghost"
            size="sm"
            @click="showMobileMenu = !showMobileMenu"
            class="p-2"
          >
            <Icon name="heroicons:bars-3" class="w-5 h-5" />
          </Button>
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div v-if="showMobileMenu" class="sm:hidden bg-white border-b border-gray-200 shadow-sm">
        <div class="p-4 flex flex-col gap-3">
          <!-- Guest User Mobile -->
          <template v-if="!user">
            <div class="flex items-center py-2">
              <Badge variant="secondary" class="text-xs">
                Invitado
              </Badge>
            </div>
            <Button 
              size="sm"
              @click="handleNavigation('/login')"
              class="w-full"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4 mr-2" />
              Iniciar sesión
            </Button>
          </template>
          
          <!-- Authenticated User Mobile -->
          <template v-else>
            <div class="flex items-center py-2">
              <Avatar 
                :style="{ backgroundColor: user.avatar_color }"
                class="w-8 h-8 mr-2"
              >
                <AvatarFallback class="text-sm">
                  {{ user.display_name.charAt(0) }}
                </AvatarFallback>
              </Avatar>
              <span class="font-medium text-gray-900">{{ user.display_name }}</span>
            </div>
            <Button 
              variant="outline"
              @click="handleNavigation('/profile')"
              class="w-full"
            >
              <Icon name="heroicons:user" class="w-4 h-4 mr-2" />
              Perfil
            </Button>
            <Button 
              variant="outline"
              @click="logout"
              class="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 p-0 max-w-7xl mx-auto w-full overflow-hidden flex flex-col">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const { user, logout: authLogout } = useAuth()
const showMobileMenu = ref(false)

const logout = async () => {
  await authLogout()
  showMobileMenu.value = false
  await navigateTo('/login')
}

// Close mobile menu when navigating
const handleNavigation = (path: string) => {
  showMobileMenu.value = false
  navigateTo(path)
}
</script>
