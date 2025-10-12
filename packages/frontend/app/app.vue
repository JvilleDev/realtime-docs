<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
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

/* Override any dark mode styles */
.p-component,
.p-card,
.p-button,
.p-inputtext,
.p-menubar,
.p-dialog,
.p-toast,
.p-confirm-dialog {
  background-color: white !important;
  color: #111827 !important;
}

/* Ensure PrimeVue components use light theme */
:root {
  --p-primary-color: #3b82f6;
  --p-primary-color-text: #ffffff;
  --p-surface-0: #ffffff;
  --p-surface-50: #f9fafb;
  --p-surface-100: #f3f4f6;
  --p-surface-200: #e5e7eb;
  --p-surface-300: #d1d5db;
  --p-surface-400: #9ca3af;
  --p-surface-500: #6b7280;
  --p-surface-600: #4b5563;
  --p-surface-700: #374151;
  --p-surface-800: #1f2937;
  --p-surface-900: #111827;
  --p-surface-border: #e5e7eb;
  --p-text-color: #111827;
  --p-text-muted-color: #6b7280;
}
</style>