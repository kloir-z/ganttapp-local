import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `--mode singlefile` でビルドすると、JS/CSS/アセットを全て index.html に
// インライン化した単一ファイルを生成する。file:// で直接開けるよう base も相対に切替。
export default defineConfig(({ mode }) => {
  const singlefile = mode === 'singlefile'
  return {
    plugins: [react(), ...(singlefile ? [viteSingleFile()] : [])],
    base: singlefile ? './' : '/ganttapp-local/',
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
  }
})
