<template>
  <div class="default-layout">
    <!-- Minimal Header -->
    <header class="layout-header">
      <div class="header-content">
        <!-- Logo -->
        <div class="header-logo">
          <span class="logo-text">RealtimeDocs</span>
        </div>
        
        <!-- Desktop User Actions -->
        <div class="header-actions desktop-only">
          <!-- Guest User -->
          <template v-if="!user">
            <Badge 
              value="Invitado" 
              severity="secondary" 
              class="guest-badge"
            />
            <Button 
              label="Iniciar sesión"
              icon="pi pi-sign-in"
              size="small"
              @click="handleNavigation('/login')"
            />
          </template>
          
          <!-- Authenticated User -->
          <template v-else>
            <Avatar 
              :label="user.display_name.charAt(0)" 
              :style="{ backgroundColor: user.avatar_color }"
              size="small"
              class="user-avatar"
            />
            <Button 
              icon="pi pi-user" 
              severity="secondary" 
              text 
              rounded
              @click="handleNavigation('/profile')"
              v-tooltip="'Perfil'"
            />
            <Button 
              icon="pi pi-sign-out" 
              severity="danger" 
              text 
              rounded
              @click="logout"
              v-tooltip="'Cerrar sesión'"
            />
          </template>
        </div>

        <!-- Mobile Menu Button -->
        <div class="mobile-menu-button mobile-only">
          <Button 
            icon="pi pi-bars" 
            text 
            rounded
            @click="showMobileMenu = !showMobileMenu"
            class="menu-toggle"
          />
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div v-if="showMobileMenu" class="mobile-menu mobile-only">
        <div class="mobile-menu-content">
          <!-- Guest User Mobile -->
          <template v-if="!user">
            <div class="mobile-menu-item">
              <Badge 
                value="Invitado" 
                severity="secondary" 
                class="guest-badge"
              />
            </div>
            <Button 
              label="Iniciar sesión"
              icon="pi pi-sign-in"
              size="small"
              @click="handleNavigation('/login')"
              class="mobile-menu-button-full"
            />
          </template>
          
          <!-- Authenticated User Mobile -->
          <template v-else>
            <div class="mobile-menu-item">
              <Avatar 
                :label="user.display_name.charAt(0)" 
                :style="{ backgroundColor: user.avatar_color }"
                size="small"
                class="mr-2"
              />
              <span class="user-name">{{ user.display_name }}</span>
            </div>
            <Button 
              label="Perfil"
              icon="pi pi-user" 
              severity="secondary" 
              outlined
              @click="handleNavigation('/profile')"
              class="mobile-menu-button-full"
            />
            <Button 
              label="Cerrar sesión"
              icon="pi pi-sign-out" 
              severity="danger" 
              outlined
              @click="logout"
              class="mobile-menu-button-full"
            />
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="layout-content">
      <slot />
    </div>

    <!-- Toast Container -->
    <Toast />
    
    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

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

<style scoped>
.default-layout {
  height: 100vh;
  background: white !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white !important;
  border-bottom: 1px solid #e5e7eb;
  height: 56px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.header-logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827 !important;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.guest-badge {
  font-size: 0.75rem;
}

.user-avatar {
  margin-right: 0.25rem;
}

.layout-content {
  flex: 1;
  padding: 0;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Mobile Menu Styles */
.mobile-menu {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mobile-menu-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
}

.user-name {
  font-weight: 500;
  color: #111827;
}

.mobile-menu-button-full {
  width: 100%;
}

/* Responsive Visibility Classes */
.desktop-only {
  display: flex;
}

.mobile-only {
  display: none;
}

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .header-content {
    padding: 0 1rem;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 0.75rem;
  }
  
  .header-actions {
    gap: 0.5rem;
  }
  
  .logo-text {
    font-size: 1.125rem;
  }
}

@media (max-width: 640px) {
  .desktop-only {
    display: none;
  }
  
  .mobile-only {
    display: block;
  }
  
  .mobile-menu-button {
    display: flex;
  }
  
  .header-content {
    padding: 0 0.5rem;
  }
  
  .logo-text {
    font-size: 1rem;
  }
}
</style>
