import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: "2025-10-12",
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  modules: ['shadcn-nuxt', ['@nuxtjs/google-fonts', {families: {"Outfit": [400,600,700,800]}}], '@nuxt/icon'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  },
  runtimeConfig: {
    public: {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    }
  },
  css: ['~/assets/css/tailwind.css', "~/assets/css/global.css"],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  ssr: true,
  routeRules: {
    '/': { prerender: true },
    '/login': { prerender: true },
    '/profile': { ssr: true },
    '/document/**': { ssr: true }
  }
})