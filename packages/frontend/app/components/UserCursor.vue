<template>
  <div 
    class="user-cursor"
    :style="cursorStyle"
    v-if="position"
  >
    <div class="cursor-line" :style="{ backgroundColor: cursor.userInfo.avatar_color }"></div>
    <div class="cursor-label" :style="{ backgroundColor: cursor.userInfo.avatar_color }">
      {{ cursor.userInfo.display_name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Editor } from '@tiptap/vue-3'

interface CursorPosition {
  userId: number
  userInfo: {
    display_name: string
    avatar_color: string
  }
  position: {
    anchor: number
    head: number
  }
  timestamp: number
}

interface Props {
  cursor: CursorPosition
  editor?: Editor
}

const props = defineProps<Props>()

const position = computed(() => {
  if (!props.editor || !props.cursor.position) return null
  
  try {
    const { anchor, head } = props.cursor.position
    const coords = props.editor.view.coordsAtPos(anchor)
    
    return {
      top: coords.top,
      left: coords.left,
      height: coords.bottom - coords.top
    }
  } catch (error) {
    return null
  }
})

const cursorStyle = computed(() => {
  if (!position.value) return {}
  
  return {
    position: 'absolute',
    top: `${position.value.top}px`,
    left: `${position.value.left}px`,
    height: `${position.value.height}px`,
    zIndex: 10,
    pointerEvents: 'none'
  }
})
</script>

<style scoped>
.user-cursor {
  position: absolute;
  z-index: 10;
  pointer-events: none;
}

.cursor-line {
  width: 2px;
  height: 100%;
  opacity: 0.8;
  animation: blink 1s infinite;
}

.cursor-label {
  position: absolute;
  top: -24px;
  left: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  opacity: 0.9;
  transform: translateX(-50%);
}

@keyframes blink {
  0%, 50% { opacity: 0.8; }
  51%, 100% { opacity: 0.3; }
}
</style>
