<template>
  <div class="presence-list">
    <div class="active-users">
      <div 
        v-for="[userId, userInfo] in activeUsers" 
        :key="userId"
        class="user-presence"
      >
        <Avatar 
          :label="userInfo.isGuest ? 'G' : userInfo.display_name.charAt(0)" 
          :style="{ backgroundColor: userInfo.avatar_color }"
          size="small"
          class="mr-2"
        />
        <span class="user-name">{{ userInfo.display_name }}</span>
        <span v-if="userInfo.isGuest" class="guest-badge">Invitado</span>
        <div class="status-indicator" :style="{ backgroundColor: userInfo.avatar_color }"></div>
      </div>
    </div>
    
    <div v-if="activeUsers.size === 0" class="no-users">
      <i class="pi pi-users text-gray-400"></i>
      <span class="text-sm text-gray-500">No hay usuarios activos</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activeUsers: Map<string, any>
}

defineProps<Props>()
</script>

<style scoped>
.presence-list {
  display: flex;
  align-items: center;
  gap: 8px;
}

.active-users {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-presence {
  display: flex;
  align-items: center;
  position: relative;
  padding: 4px 8px;
  background: #f9fafb;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.guest-badge {
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 4px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 4px;
  animation: pulse 2s infinite;
}

.no-users {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
