---
name: verify
description: このリポジトリ(ガントチャートアプリ)の変更をヘッドレスで実機検証する手順。dev サーバ + puppeteer + window.__store でデータ注入し、実UI操作と DOM/スクリーンショットで観察する。
---

# ganttapp-local の実機検証手順

## 起動

```powershell
npm run dev          # http://localhost:5173/ganttapp-local/ (base パス必須)
netstat -an | findstr :5173   # 起動確認
```

## ハンドル

- 開発ビルドは `window.__store`(Redux store)を公開している(`store.ts` 末尾、dev のみ)。
  `s.dispatch({ type: 'wbsData/setEntireData', payload: data })` などで直接データを注入できる。
- puppeteer はリポジトリの devDependencies に入っている。リポジトリ外のスクリプトから使うときは
  `$env:NODE_PATH = 'c:\code\ganttapp-local\node_modules'` を設定する。
- 既存の雛形: `scripts/capture-gantt.cjs`(データ注入 → スクリーンショット → PDF エクスポート検証)。

## 典型的な流れ

1. `page.goto(URL)` → `page.waitForFunction(() => !!window.__store)`
2. データ注入後に `uiFlags/setActiveModal: null` と `uiFlags/setIsLoading: false` を dispatch
   (ウェルカムモーダルとローディングを消す)
3. UI 操作で駆動し、`getComputedStyle` / ストア state / スクリーンショットで観察する

## ハマりどころ

- **UI 言語は日本語がデフォルト**になり得る。ボタン/メニューをテキストで探すときは
  en/ja 両方のラベルを試す(例: 'Setting' と '設定')。
- トップメニュー(File/Edit/Setting)は対象ボタンへの **mousedown** で開く。puppeteer の
  `element.click()`(実イベント)なら開くが、`page.evaluate` 内の `el.click()` では開かない。
- ReactGrid のセル編集は「セル中心をダブルクリック → キーボード入力 → Enter」で通る。
  セル座標は `.rg-cell` のテキスト内容から `getBoundingClientRect()` で求めるのが確実。
- チャートのバー(StyledBar)は「position:absolute + inline の left/width + 背景色」で判別できる。
