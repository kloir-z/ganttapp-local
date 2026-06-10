import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 外部ドメインを一切含まない Content-Security-Policy。
// このアプリの「データはどこにも送信されない」という宣言を、ブラウザ自身が
// 強制する形で担保する（接続・フォーム送信・画像読み込み等すべて同一オリジンのみ）。
// 本番ビルドは全アセットをインライン化した単一HTMLなので script/style は
// 'unsafe-inline' を許可する。ここでの CSP の目的は XSS 防御ではなく
// 「外部送信が不可能であることの検証可能な証明」である。
const CSP_POLICY = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

// ビルド時のみ CSP meta を <head> 先頭に注入する。dev サーバーは HMR が
// インラインスクリプト・WebSocket を使うため対象外（配布物にだけ効けばよい）。
const injectCsp = (): PluginOption => ({
  name: 'inject-csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_POLICY },
          injectTo: 'head-prepend',
        },
      ],
    }
  },
})

// `--mode singlefile` でビルドすると、JS/CSS/アセットを全て index.html に
// インライン化した単一ファイルを生成する。file:// で直接開けるよう base も相対に切替。
export default defineConfig(({ mode }) => {
  const singlefile = mode === 'singlefile'
  return {
    plugins: [react(), injectCsp(), ...(singlefile ? [viteSingleFile()] : [])],
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
