<template>
  <div class="hocuspocus-editor">
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

    <!-- Connection Status -->
    <div v-if="connectionStatus !== 'connected'" class="connection-status">
      <div class="status-indicator" :class="connectionStatus">
        <Icon v-if="connectionStatus === 'connecting'" name="material-symbols:sync" class="animate-spin"/>
        <Icon v-else-if="connectionStatus === 'error'" name="material-symbols:error"/>
        <Icon v-else name="material-symbols:cloud-off"/>
      </div>
      <span class="status-text">
        {{ getStatusText() }}
      </span>
    </div>

    <!-- Editor Content -->
    <div class="editor-container">
      <div class="editor-content" ref="editorRef">
        <EditorContent :editor="editor" />
      </div>
    </div>

    <!-- User Cursors (from awareness) -->
    <div class="user-cursors">
      <div
        v-for="(state, clientId) in awarenessStates"
        :key="clientId"
        class="user-cursor"
        :style="getCursorStyle(state)"
      >
        <div 
          class="cursor-line"
          :class="{
            'admin-cursor': state.user?.is_admin
          }"
          :style="{ backgroundColor: state.user?.avatar_color || '#3B82F6' }"
        ></div>
        <div 
          class="cursor-label"
          :style="{ backgroundColor: state.user?.avatar_color || '#3B82F6' }"
        >
          {{ state.user?.display_name || 'Usuario' }}
          <span v-if="state.user?.is_admin" class="admin-badge">👑</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { useAuth } from '~/composables/useAuth'
import { useHocuspocus } from '~/composables/useHocuspocus'

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

// Hocuspocus for real-time collaboration
const { 
  provider,
  document: ydoc,
  isConnected, 
  connectionStatus,
  connect: connectHocuspocus, 
  disconnect: disconnectHocuspocus,
  getAwareness
} = useHocuspocus()

const { user } = useAuth()

// Awareness states for user cursors
const awarenessStates = ref<Map<number, any>>(new Map())

// Initialize editor
onMounted(async () => {
  if (!editorRef.value) return

  try {
    // Connect to Hocuspocus
    connectHocuspocus(props.documentId)

    // Wait for connection
    await new Promise<void>((resolve) => {
      if (isConnected.value) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        console.warn('⚠️ Hocuspocus connection timeout, proceeding anyway')
        resolve()
      }, 10000)

      watch(isConnected, (connected) => {
        if (connected) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    // Setup awareness for user cursors
    const awareness = getAwareness()
    if (awareness) {
      // Set local user info
      awareness.setLocalStateField('user', {
        id: user.value?.id,
        display_name: user.value?.display_name || 'Usuario',
        avatar_color: user.value?.avatar_color || '#3B82F6',
        is_admin: user.value?.is_admin || false
      })

      // Listen for awareness changes
      awareness.on('change', () => {
        const states = awareness.getStates()
        awarenessStates.value = new Map(states)
      })
    }

    // Initialize editor with collaboration
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
          // Disable history since collaboration handles it
          history: false,
        }),
        // Add collaboration extension
        Collaboration.configure({
          document: ydoc,
        }),
        // Add collaboration cursor extension
        CollaborationCaret.configure({
          provider: provider.value,
          user: {
            name: user.value?.display_name || 'Usuario',
            color: user.value?.avatar_color || '#3B82F6',
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

    // Setup floating toolbar
    setupFloatingToolbar()

    console.log('✅ Hocuspocus editor initialized successfully')
    
  } catch (error) {
    console.error('❌ Error initializing Hocuspocus editor:', error)
    // Fallback to basic editor without collaboration
    try {
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

// Get status text for connection status
const getStatusText = () => {
  switch (connectionStatus.value) {
    case 'connecting':
      return 'Conectando...'
    case 'connected':
      return 'Conectado'
    case 'error':
      return 'Error de conexión'
    case 'disconnected':
      return 'Desconectado'
    default:
      return 'Desconectado'
  }
}

// Get cursor style for positioning (simplified for awareness)
const getCursorStyle = (state: any) => {
  if (!editor.value || !state.cursor || !editorRef.value) {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      pointerEvents: 'none',
      zIndex: 10,
      opacity: 0
    }
  }
  
  try {
    const { anchor } = state.cursor
    
    // Use TipTap's coordsAtPos method to get accurate coordinates
    const coords = editor.value.view.coordsAtPos(anchor)
    
    // Get the editor container's bounding rectangle
    const containerRect = editorRef.value.getBoundingClientRect()
    
    // Calculate position relative to the editor container
    const relativeLeft = coords.left - containerRect.left
    const relativeTop = coords.top - containerRect.top
    
    // Ensure coordinates are within reasonable bounds
    const isValidPosition = relativeLeft >= 0 && relativeTop >= 0 && 
                           relativeLeft <= containerRect.width && 
                           relativeTop <= containerRect.height
    
    if (!isValidPosition) {
      return {
        position: 'absolute',
        left: '0px',
        top: '0px',
        pointerEvents: 'none',
        zIndex: 10,
        opacity: 0
      }
    }
    
    return {
      position: 'absolute',
      left: `${relativeLeft}px`,
      top: `${relativeTop}px`,
      height: `${coords.bottom - coords.top}px`,
      pointerEvents: 'none',
      zIndex: 10,
      opacity: 1
    }
  } catch (error) {
    console.warn('Error calculating cursor position:', error)
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      pointerEvents: 'none',
      zIndex: 10,
      opacity: 0
    }
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
  
  // Disconnect from Hocuspocus
  disconnectHocuspocus()
})
</script>

<style scoped>
.hocuspocus-editor {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
}

.connection-status {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-indicator.connecting {
  background: #f59e0b;
  color: white;
}

.status-indicator.connected {
  background: #10b981;
  color: white;
}

.status-indicator.error {
  background: #ef4444;
  color: white;
}

.status-indicator.disconnected {
  background: #6b7280;
  color: white;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
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
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  min-height: calc(100svh - 200px);
}

.editor-content {
  width: 100%;
  min-height: calc(100vh - 300px);
  cursor: text;
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
  border-radius: 1px;
}

.admin-cursor {
  width: 3px;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  animation: adminBlink 1s infinite;
  border-radius: 1.5px;
}

.cursor-label {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  opacity: 0.95;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
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
    min-height: calc(100vh - 150px);
  }
  
  .editor-content {
    width: 100%;
    min-height: calc(100vh - 250px);
  }
  
  :deep(.ProseMirror) {
    min-height: calc(100vh - 350px);
  }
}

@media (max-width: 768px) {
  .editor-container {
    padding: 16px;
    min-height: calc(100vh - 120px);
  }
  
  .editor-content {
    width: 100%;
    min-height: calc(100vh - 200px);
    padding: 12px;
  }
  
  :deep(.ProseMirror) {
    padding: 16px;
    font-size: 16px;
    min-height: calc(100vh - 300px);
  }
  
  .hocuspocus-editor .ProseMirror h1 {
    font-size: 1.875rem;
  }
  
  .hocuspocus-editor .ProseMirror h2 {
    font-size: 1.5rem;
  }
  
  .hocuspocus-editor .ProseMirror h3 {
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
  
  .connection-status {
    top: 10px;
    right: 10px;
    padding: 6px 10px;
  }
}

@media (max-width: 640px) {
  .editor-container {
    padding: 12px;
    min-height: calc(100vh - 100px);
  }
  
  .editor-content {
    width: 100%;
    min-height: calc(100vh - 180px);
    padding: 8px;
  }
  
  :deep(.ProseMirror) {
    padding: 12px;
    font-size: 16px;
    min-height: calc(100vh - 250px);
  }
  
  .hocuspocus-editor .ProseMirror h1 {
    font-size: 1.5rem;
  }
  
  .hocuspocus-editor .ProseMirror h2 {
    font-size: 1.25rem;
  }
  
  .hocuspocus-editor .ProseMirror h3 {
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
  
  .connection-status {
    top: 5px;
    right: 5px;
    padding: 4px 8px;
  }
  
  .status-text {
    font-size: 10px;
  }
}
</style>
