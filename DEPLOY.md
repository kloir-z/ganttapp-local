# GitHub Pages デプロイ手順

このアプリは [`gh-pages`](https://www.npmjs.com/package/gh-pages) パッケージを使って、
ビルド成果物（`dist/`）を `gh-pages` ブランチへ公開します。GitHub Actions による
自動デプロイは設定していません。

## 前提条件

- GitHubアカウント
- このリポジトリがGitHubにプッシュされていること
- 依存関係をインストール済み（`npm install`）

## 初回セットアップ（GitHub Pages の有効化）

1. GitHubリポジトリページで **Settings** タブを開く
2. 左側メニューから **Pages** を選択
3. **Build and deployment** の **Source** で **Deploy from a branch** を選択
4. **Branch** で `gh-pages` / `/(root)` を選び **Save**
5. 公開URL：
   ```
   https://[username].github.io/ganttapp-local/
   ```

## デプロイ（更新）

変更をコミットした後、以下を実行します：

```bash
npm run deploy
```

- `predeploy` が自動で `npm run build` を実行します
  （`vite.config.ts` の `base: '/ganttapp-local/'` が適用されます）
- 続いて `gh-pages -d dist` が `dist/` を `gh-pages` ブランチへプッシュし、
  GitHub Pages の配信が更新されます

> **注**: 自動デプロイ（GitHub Actions）は設定していません。
> デモを最新化するには、その都度 `npm run deploy` を実行してください。

## ローカルでの確認

GitHub Pages と同じ `base` でビルドして確認します：

```bash
npm run build      # 本番ビルド（base: /ganttapp-local/ が適用される）
npm run preview    # ローカルサーバーでプレビュー
```

## 単一HTMLでの配布（サーバー不要）

GitHub Pages を使わず、1ファイルを配って `file://` で開いてもらう方法もあります：

```bash
npm run build:singlefile   # dist-single/index.html を生成
```

`dist-single/index.html` の1ファイルだけを配布すれば、ダブルクリックで起動します
（詳細・制限は README の「単一HTMLビルド」を参照）。

## トラブルシューティング

### アセットが読み込まれない場合

1. `vite.config.ts` の `base` がリポジトリ名（`/ganttapp-local/`）と一致しているか確認
2. GitHub Pages の **Source** が `gh-pages` ブランチになっているか確認

### デプロイが反映されない場合

1. `gh-pages` ブランチに最新の `dist` がプッシュされたか確認
2. 反映には数分かかる場合があります。ブラウザのキャッシュもクリアして確認

## セキュリティ注意事項

- 機密情報をリポジトリに含めない
- 定期的に依存関係をアップデートする
