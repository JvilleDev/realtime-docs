<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster />
  </div>
</template>

<script setup>
import { Toaster } from '@/components/ui/sonner'
</script>
<style>
* {
  font-family: 'Outfit', sans-serif;
}

/* Force light mode */
html {
  color-scheme: light !important;
}

body {
  background-color: white !important;
  color: #111827 !important;
}
</style>