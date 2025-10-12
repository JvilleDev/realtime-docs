import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  compatibilityDate: "2025-10-12",
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  modules: ['@primevue/nuxt-module', ['@nuxtjs/google-fonts', {families: {"Outfit": [400,600,700,800]}}], '@nuxt/icon'],
  primevue: {
    options: {
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
          cssLayer: false
        }
      }
    }
  },
  runtimeConfig: {
    public: {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    }
  },
  css: ["primeicons/primeicons.css", "~/assets/css/global.css"],
  ssr: true,
  
  // Build optimizations
  nitro: {
    compressPublicAssets: true,
    minify: true
  },
  
  // Performance optimizations
  experimental: {
    payloadExtraction: false
  },
  
  // Security headers
  routeRules: {
    '/': { prerender: true },
    '/login': { prerender: true },
    '/profile': { ssr: true },
    '/document/**': { ssr: true }
  }
})