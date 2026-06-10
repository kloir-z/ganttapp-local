# scripts/

開発・検証・アセット生成用のスクリプト群。アプリ本体からは参照されない。

## 検証（CSP / 機能）

ビルド済み単一HTML（`dist-single/index.html`）を headless Chrome で実際に開き、
CSP 違反ゼロで全機能が動くことを確認する。SECURITY.md / DEPLOY.md から参照。

```bash
npm run build:singlefile
node scripts/verify-csp.mjs            # file:// 起動と CSP 違反ゼロの確認
node scripts/verify-csp-export.mjs     # PDF / Excel / 単体HTML 出力の確認
node scripts/verify-exported-html.mjs  # 書き出した単体HTML自身の起動確認
```

## README デモGIFの再生成

UI を変更したら README 冒頭の `docs/images/demo.gif` を作り直す。
前提: ffmpeg が PATH にあること。

```bash
npm run build:singlefile
node scripts/gen-demo-page.mjs         # サンプルを焼き込んだ dist-single/demo.html を生成
npx serve dist-single -l 5050          # 別ターミナルで配信（file:// ではサンプル不可のため）
node scripts/gen-demo-gif.mjs          # 録画 → 仮想カメラ合成 → docs/images/demo.gif
```

シーン構成（バーのドラッグ→依存連動、色設定のライブ変更）やカメラワークは
`gen-demo-gif.mjs` のストーリーボード部分を編集する。

> **録画の注意（ハマりどころ）**: deviceScaleFactor=2 でのキャプチャ中、
> メニュー表示などのレイアウト変化後に Chromium が合成 mousemove を
> **座標が半分のまま**再発火するバグがあり、それが別のトップバーボタンに
> 当たるとメニューが切替わって録画が壊れる。そのためメニュー操作は
> 「見た目のカーソルだけ動かし、実際の操作は DOM イベントで発火、
> 実マウスは無害な座標に退避」という方式になっている。実マウスを使うのは
> バー・モーダル・スライダーのドラッグのみ。

## Social preview（OGP）画像の再生成

`docs/images/screenshot.png` を差し替えたら実行し、生成された
`docs/images/social-preview.png` を GitHub の Settings → General →
Social preview に手動アップロードする（API なし）。

```bash
node scripts/make-social-preview.mjs
```

## その他

- `generateHolidays.js` — `public/i18n/holidays/` の祝日データ生成（`npm run generate-holidays`）
