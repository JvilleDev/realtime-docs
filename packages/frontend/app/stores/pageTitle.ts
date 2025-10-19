import { defineStore } from 'pinia'

export const usePageTitleStore = defineStore('pageTitle', () => {
  const title = ref<string>('RealtimeDocs')
  const subtitle = ref<string>('')
  const description = ref<string>('')

  const setTitle = (newTitle: string, newSubtitle?: string, newDescription?: string) => {
    title.value = newTitle
    subtitle.value = newSubtitle || ''
    description.value = newDescription || ''
  }

  const resetTitle = () => {
    title.value = 'RealtimeDocs'
    subtitle.value = ''
    description.value = ''
  }

  return {
    title: readonly(title),
    subtitle: readonly(subtitle),
    description: readonly(description),
    setTitle,
    resetTitle
  }
})
