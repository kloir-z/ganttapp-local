# GitHub Pages デプロイ手順

このアプリは [`gh-pages`](https://www.npmjs.com/package/gh-pages) パッケージを使って、
**単一HTMLビルドの成果物（`dist-single/`）** を `gh-pages` ブランチへ公開します。
GitHub Actions による自動デプロイは設定していません。

> **なぜ単一HTMLビルドを配信するのか**: ライブサイトの「ファイル → 単体HTMLファイルに
> 出力」で書き出したファイルが `file://`（ダブルクリック）でそのまま動くようにするためです。
> 通常の分割ビルドは `<script type="module">` 形式で、`file://` では実行できません。
> 単一HTMLビルドはクラシックスクリプトに変換されるため、書き出したスナップショットも動作します。

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

- `predeploy` が自動で `npm run build:singlefile` を実行します
  （`--mode singlefile`：全アセットを `dist-single/index.html` にインライン化、`base: './'`、HashRouter）
- 続いて `gh-pages -d dist-single` が `dist-single/` を `gh-pages` ブランチへプッシュし、
  GitHub Pages の配信が更新されます
- 公開URLは `https://[username].github.io/ganttapp-local/#/`（HashRouter のため `#/` が付きます）

> **注**: 自動デプロイ（GitHub Actions）は設定していません。
> デモを最新化するには、その都度 `npm run deploy` を実行してください。

## ローカルでの確認

配信されるものと同じ単一HTMLビルドで確認します：

```bash
npm run build:singlefile   # dist-single/index.html を生成
```

`dist-single/index.html` をブラウザで開けば、配信版と同じ挙動を確認できます
（ダブルクリックの `file://` でも動作します）。

分割ビルド版（開発・プレビュー用）を確認する場合：

```bash
npm run build      # dist/ に出力（base: /ganttapp-local/）
npm run preview    # ローカルサーバーでプレビュー
```

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
