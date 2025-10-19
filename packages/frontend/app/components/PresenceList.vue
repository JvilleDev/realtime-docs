<template>
  <div class="presence-list">
    <div class="active-users">
      <div 
        v-for="[userId, userInfo] in uniqueUsers" 
        :key="userId"
        class="user-avatar-container"
        :title="userInfo.display_name"
      >
        <div 
          class="user-avatar"
          :style="{ backgroundColor: userInfo.avatar_color }"
        >
          {{ userInfo.isGuest ? 'G' : userInfo.display_name.charAt(0) }}
        </div>
        <div class="status-indicator" :style="{ backgroundColor: userInfo.avatar_color }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activeUsers: Map<string, any>
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

// Computed property to ensure unique users (one presence per user)
const uniqueUsers = computed(() => {
  const userMap = new Map()
  
  // Process all users and keep only the latest entry for each unique user
  props.activeUsers.forEach((userInfo, userId) => {
    // Use display_name as the unique identifier to avoid duplicates
    const uniqueKey = userInfo.display_name || userId
    
    // Keep the most recent entry (or the first one if timestamps are equal)
    if (!userMap.has(uniqueKey) || 
        (userInfo.timestamp && userMap.get(uniqueKey).timestamp && 
         userInfo.timestamp > userMap.get(uniqueKey).timestamp)) {
      userMap.set(uniqueKey, userInfo)
    }
  })
  
  return Array.from(userMap.entries())
})
</script>

<style scoped>
.presence-list {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.active-users {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
