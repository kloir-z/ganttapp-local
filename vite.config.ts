import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/gantapp-local/',
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 100000000, // 100MB - forces all assets to be inlined
  },
})