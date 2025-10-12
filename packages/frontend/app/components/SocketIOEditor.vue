<template>
  <div class="socketio-editor">
    <!-- Floating Toolbar -->
    <div 
      v-if="showFloatingToolbar && editor" 
      class="floating-toolbar"
      :style="floatingToolbarStyle"
    >
      <div class="toolbar-content">
        <!-- Text Formatting -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleBold().run()"
            :class="{ 'is-active': editor.isActive('bold') }"
            class="toolbar-button"
            title="Negrita"
          >
            <Icon name="material-symbols:format-bold"/>
          </button>
          <button
            @click="editor.chain().focus().toggleItalic().run()"
            :class="{ 'is-active': editor.isActive('italic') }"
            class="toolbar-button"
            title="Cursiva"
          >
            <Icon name="material-symbols:format-italic"/>
          </button>
          <button
            @click="editor.chain().focus().toggleStrike().run()"
            :class="{ 'is-active': editor.isActive('strike') }"
            class="toolbar-button"
            title="Tachado"
          >
            <Icon name="material-symbols:format-strikethrough"/>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Block Types -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
            :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
            class="toolbar-button"
            title="Encabezado 1"
          >
            <Icon name="material-symbols:format-h1"/>
          </button>
          <button
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
            :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
            class="toolbar-button"
            title="Encabezado 2"
          >
            <Icon name="material-symbols:format-h2"/>
          </button>
          <button
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
            :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
            class="toolbar-button"
            title="Encabezado 3"
          >
            <Icon name="material-symbols:format-h3"/>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Lists -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleBulletList().run()"
            :class="{ 'is-active': editor.isActive('bulletList') }"
            class="toolbar-button"
            title="Lista con viñetas"
          >
            <Icon name="material-symbols:format-list-bulleted"/>
          </button>
          <button
            @click="editor.chain().focus().toggleOrderedList().run()"
            :class="{ 'is-active': editor.isActive('orderedList') }"
            class="toolbar-button"
            title="Lista numerada"
          >
            <Icon name="material-symbols:format-list-numbered"/>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Other Blocks -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleBlockquote().run()"
            :class="{ 'is-active': editor.isActive('blockquote') }"
            class="toolbar-button"
            title="Cita"
          >
            <Icon name="material-symbols:format-quote"/>
          </button>
          <button
            @click="editor.chain().focus().toggleCodeBlock().run()"
            :class="{ 'is-active': editor.isActive('codeBlock') }"
            class="toolbar-button"
            title="Bloque de código"
          >
            <Icon name="material-symbols:code"/>
          </button>
        </div>
      </div>
    </div>

    <!-- Editor Content -->
    <div class="editor-container">
      <div class="editor-content" ref="editorRef">
        <EditorContent :editor="editor" />
      </div>
    </div>

    <!-- User Cursors -->
    <div class="user-cursors">
      <div
        v-for="(cursor, userId) in cursors"
        :key="userId"
        class="user-cursor"
        :style="getCursorStyle(cursor)"
      >
        <div 
          class="cursor-line"
          :class="{
            'admin-cursor': cursor.userInfo?.is_admin,
            'local-cursor': userId === peerId
          }"
          :style="{ backgroundColor: cursor.userInfo?.avatar_color || '#3B82F6' }"
        ></div>
        <div 
          class="cursor-label"
          :style="{ backgroundColor: cursor.userInfo?.avatar_color || '#3B82F6' }"
        >
          {{ cursor.userInfo?.display_name || 'Usuario' }}
          <span v-if="cursor.userInfo?.is_admin" class="admin-badge">👑</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { useAuth } from '~/composables/useAuth'
import { useSocketIO } from '~/composables/useSocketIO'
import { useDebounceFn } from '@vueuse/core'

interface Props {
  documentId: string
  initialContent?: any
  value?: any
  isGuest?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialContent: null,
  value: null,
  isGuest: false
})

const emit = defineEmits<{
  'content-change': [content: any]
}>()

const editorRef = ref<HTMLElement>()
const editor = ref<Editor>()
const showFloatingToolbar = ref(false)
const floatingToolbarStyle = ref({})

// Socket.IO for real-time collaboration
const { 
  socket, 
  isConnected, 
  peerId, 
  connect: connectSocket, 
  disconnect: disconnectSocket,
  joinDocument,
  leaveDocument,
  updateDocument,
  moveCursor,
  startTyping,
  stopTyping
} = useSocketIO()

const { user } = useAuth()

// Real-time collaboration state
const cursors = ref<Record<string, any>>({})
const typingUsers = ref<Set<string>>(new Set())

// Debounced update function
const debouncedUpdate = useDebounceFn((content: any) => {
  if (!props.isGuest && isConnected.value) {
    console.log('📝 Sending document update via Socket.IO')
    updateDocument(props.documentId, content)
  }
}, 500)

// Initialize editor
onMounted(async () => {
  if (!editorRef.value) return

  try {
    console.log('📝 Initializing Socket.IO editor for document:', props.documentId)

    // Connect to Socket.IO
    connectSocket()

    // Wait for connection
    await new Promise<void>((resolve) => {
      if (isConnected.value) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        console.warn('⚠️ Socket.IO connection timeout, proceeding anyway')
        resolve()
      }, 5000)

      watch(isConnected, (connected) => {
        if (connected) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    // Join document room
    joinDocument(props.documentId)

    // Setup Socket.IO event listeners
    if (socket.value) {
      // Handle document updates from other users
      socket.value.on('document:update', (data: any) => {
        console.log('📄 Received document update from another user:', data.userId)
        
        // Only apply if it's from another user
        if (data.userId !== peerId.value) {
          if (editor.value) {
            editor.value.commands.setContent(data.content, false)
          }
        }
      })

      // Handle cursor movements
      socket.value.on('cursor:move', (data: any) => {
        if (data.userId !== peerId.value) {
          cursors.value[data.userId] = {
            position: data.position,
            userInfo: data.userInfo,
            timestamp: data.timestamp
          }
        }
      })

      // Handle typing status
      socket.value.on('typing:start', (data: any) => {
        if (data.userId !== peerId.value) {
          typingUsers.value.add(data.userId)
        }
      })

      socket.value.on('typing:stop', (data: any) => {
        if (data.userId !== peerId.value) {
          typingUsers.value.delete(data.userId)
        }
      })

      // Handle presence updates
      socket.value.on('presence:init', (presence: any) => {
        console.log('👥 Initial presence:', presence)
        cursors.value = presence
      })

      socket.value.on('presence:update', (data: any) => {
        if (data.type === 'user_joined') {
          cursors.value[data.userId] = {
            position: { anchor: 0, head: 0 },
            userInfo: data.userInfo,
            timestamp: Date.now()
          }
        } else if (data.type === 'user_left') {
          delete cursors.value[data.userId]
          typingUsers.value.delete(data.userId)
        }
      })
    }

    // Initialize editor
    editor.value = new Editor({
      element: editorRef.value,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          hardBreak: {
            keepMarks: false,
          },
        }),
      ],
      content: props.initialContent || {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Comienza a escribir...'
              }
            ]
          }
        ]
      },
      editable: !props.isGuest,
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        },
        handleKeyDown: (view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            return false;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (!props.isGuest) {
          const content = editor.getJSON()
          emit('content-change', content)
          
          // Send update via Socket.IO
          debouncedUpdate(content)
        }
      },
      onSelectionUpdate: ({ editor }) => {
        if (!props.isGuest && isConnected.value) {
          const { from, to } = editor.state.selection
          moveCursor(props.documentId, { anchor: from, head: to })
        }
      },
    })

    // Setup floating toolbar
    setupFloatingToolbar()

    console.log('✅ Socket.IO editor initialized successfully')

  } catch (error) {
    console.error('❌ Error initializing Socket.IO editor:', error)
    
    // Create fallback editor without collaboration
    try {
      console.log('Creating fallback editor without collaboration')
      
      editor.value = new Editor({
        element: editorRef.value,
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3],
            },
            hardBreak: {
              keepMarks: false,
            },
          }),
        ],
        content: props.initialContent || {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Comienza a escribir...'
                }
              ]
            }
          ]
        },
        editable: !props.isGuest,
        editorProps: {
          attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
          },
          handleKeyDown: (view, event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              return false;
            }
            return false;
          },
        },
        onUpdate: ({ editor }) => {
          if (!props.isGuest) {
            const content = editor.getJSON()
            emit('content-change', content)
          }
        },
      })
      
      setupFloatingToolbar()
      
    } catch (fallbackError) {
      console.error('Fallback editor creation failed:', fallbackError)
      throw error
    }
  }
})

// Setup floating toolbar
const setupFloatingToolbar = () => {
  if (!editor.value) return

  editor.value.on('selectionUpdate', ({ editor }) => {
    const { state } = editor
    const { selection } = state
    const { empty } = selection

    if (empty) {
      showFloatingToolbar.value = false
      return
    }

    const { from, to } = selection
    const start = state.doc.resolve(from)
    const end = state.doc.resolve(to)

    // Show toolbar for text selections
    if (start.parent.type.name === 'paragraph' || start.parent.type.name === 'heading') {
      showFloatingToolbar.value = true
      
      // Position toolbar
      const coords = editor.view.coordsAtPos(from)
      floatingToolbarStyle.value = {
        position: 'absolute',
        top: `${coords.top - 60}px`,
        left: `${coords.left}px`,
        zIndex: 1000,
      }
    } else {
      showFloatingToolbar.value = false
    }
  })
}

// Get cursor style for positioning
const getCursorStyle = (cursor: any) => {
  // This is a simplified version - in a real implementation,
  // you'd need to map cursor positions to actual DOM coordinates
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    pointerEvents: 'none',
    zIndex: 10
  }
}

onUnmounted(() => {
  // Clean up editor
  if (editor.value) {
    try {
      editor.value.destroy()
    } catch (error) {
      console.warn('Error destroying editor:', error)
    }
  }
  
  // Leave document and disconnect
  if (isConnected.value) {
    leaveDocument(props.documentId)
  }
  disconnectSocket()
})
</script>

<style scoped>
.socketio-editor {
  position: relative;
  width: 100%;
  height: 100%;
  background: white;
}

.floating-toolbar {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.toolbar-button:hover {
  background: #f3f4f6;
}

.toolbar-button.is-active {
  background: #3b82f6;
  color: white;
}

.editor-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

.editor-content {
  max-width: 800px;
  margin: 0 auto;
  min-height: 200px;
}

/* User cursors */
.user-cursors {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.user-cursor {
  position: absolute;
  pointer-events: none;
}

.cursor-line {
  width: 2px;
  height: 100%;
  opacity: 0.8;
  animation: blink 1s infinite;
}

.admin-cursor {
  width: 3px;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  animation: adminBlink 1s infinite;
}

.local-cursor {
  opacity: 0.8;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.cursor-label {
  position: absolute;
  top: -28px;
  left: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  opacity: 0.95;
  transform: translateX(-50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.admin-badge {
  margin-left: 4px;
  font-size: 10px;
  opacity: 0.9;
}

@keyframes blink {
  0%, 50% { opacity: 0.8; }
  51%, 100% { opacity: 0.3; }
}

@keyframes adminBlink {
  0%, 30% { opacity: 1; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8); }
  31%, 60% { opacity: 0.6; box-shadow: 0 0 4px rgba(239, 68, 68, 0.4); }
  61%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8); }
}

/* Prose styles for better typography */
:deep(.prose) {
  color: #374151;
  line-height: 1.7;
}

:deep(.prose h1) {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 2rem 0 1rem 0;
  color: #111827;
}

:deep(.prose h2) {
  font-size: 1.875rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem 0;
  color: #111827;
}

:deep(.prose h3) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1.25rem 0 0.5rem 0;
  color: #111827;
}

:deep(.prose p) {
  margin: 1rem 0;
  font-size: 1rem;
}

:deep(.prose ul, .prose ol) {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

:deep(.prose li) {
  margin: 0.25rem 0;
}

:deep(.prose blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: #6b7280;
}

:deep(.prose code) {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #dc2626;
}

:deep(.prose pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5rem 0;
}

:deep(.prose pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

:deep(.prose hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 2rem 0;
}

/* Focus styles */
:deep(.ProseMirror) {
  outline: none;
}

:deep(.ProseMirror:focus) {
  outline: none;
}

/* Placeholder styles */
:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

/* Selection styles */
:deep(.ProseMirror-selectednode) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Floating toolbar animations */
.floating-toolbar {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 1024px) {
  .editor-container {
    padding: 20px;
  }
  
  .editor-content {
    max-width: 700px;
  }
}

@media (max-width: 768px) {
  .editor-container {
    padding: 16px;
  }
  
  .editor-content {
    max-width: 100%;
    padding: 12px;
  }
  
  .socketio-editor .ProseMirror {
    padding: 16px;
    font-size: 16px;
  }
  
  .socketio-editor .ProseMirror h1 {
    font-size: 1.875rem;
  }
  
  .socketio-editor .ProseMirror h2 {
    font-size: 1.5rem;
  }
  
  .socketio-editor .ProseMirror h3 {
    font-size: 1.25rem;
  }
  
  .floating-toolbar {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
    z-index: 1000;
    max-width: 90vw;
    overflow-x: auto;
  }
  
  .toolbar-content {
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 2px;
  }
  
  .toolbar-group {
    flex-shrink: 0;
  }
}

@media (max-width: 640px) {
  .editor-container {
    padding: 12px;
  }
  
  .editor-content {
    padding: 8px;
  }
  
  .socketio-editor .ProseMirror {
    padding: 12px;
    font-size: 16px;
  }
  
  .socketio-editor .ProseMirror h1 {
    font-size: 1.5rem;
  }
  
  .socketio-editor .ProseMirror h2 {
    font-size: 1.25rem;
  }
  
  .socketio-editor .ProseMirror h3 {
    font-size: 1.125rem;
  }
  
  .floating-toolbar {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
    z-index: 1000;
    max-width: 95vw;
    padding: 6px;
  }
  
  .toolbar-button {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .cursor-label {
    font-size: 10px;
    padding: 2px 6px;
    top: -24px;
  }
}
</style>
