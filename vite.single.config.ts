import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: 'dist-single',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        entryFileNames: 'gantt-chart.js',
        assetFileNames: 'gantt-chart.[ext]',
      },
    },
    assetsInlineLimit: 100000000, // 100MB - forces all assets to be inlined
    cssCodeSplit: false, // Don't split CSS into separate files
  },
  define: {
    // Ensure production build
    'process.env.NODE_ENV': '"production"'
  }
})