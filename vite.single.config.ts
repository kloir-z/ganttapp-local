import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to inline everything
const inlineEverythingPlugin = () => {
  return {
    name: 'inline-everything',
    generateBundle(options, bundle) {
      // Find the HTML file
      const htmlFile = Object.keys(bundle).find(name => name.endsWith('.html'))
      const jsFiles = Object.keys(bundle).filter(name => name.endsWith('.js'))
      const cssFiles = Object.keys(bundle).filter(name => name.endsWith('.css'))

      if (htmlFile && jsFiles.length > 0) {
        let htmlContent = bundle[htmlFile].source || ''
        
        // Inline JavaScript
        jsFiles.forEach(jsFile => {
          const jsContent = bundle[jsFile].code || bundle[jsFile].source
          const scriptTag = new RegExp(`<script[^>]*src="[^"]*${jsFile}"[^>]*></script>`, 'g')
          htmlContent = htmlContent.replace(scriptTag, `<script type="module">${jsContent}</script>`)
          delete bundle[jsFile] // Remove the separate JS file
        })

        // Inline CSS
        cssFiles.forEach(cssFile => {
          const cssContent = bundle[cssFile].source
          const linkTag = new RegExp(`<link[^>]*href="[^"]*${cssFile}"[^>]*>`, 'g')
          htmlContent = htmlContent.replace(linkTag, `<style>${cssContent}</style>`)
          delete bundle[cssFile] // Remove the separate CSS file
        })

        bundle[htmlFile].source = htmlContent
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), inlineEverythingPlugin()],
  build: {
    sourcemap: false,
    outDir: 'dist-single',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        entryFileNames: 'app.js',
        assetFileNames: 'assets.[ext]',
      },
    },
    assetsInlineLimit: 10000000, // 10MB
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})