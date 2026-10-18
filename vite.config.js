import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    // Mantiene la URL de desarrollo y detecta guardados externos en Windows.
    port: 5173,
    strictPort: true,
    watch: { usePolling: process.platform === 'win32', interval: 250 },
  },
})
