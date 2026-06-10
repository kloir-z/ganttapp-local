# GitHub Pages デプロイ手順

このアプリのデプロイは **GitHub Actions**（`.github/workflows/deploy.yml`）で行います。
`master` へ push すると、GitHub のインフラ上で単一HTMLビルド（`dist-single/`）が
ビルドされ、そのまま GitHub Pages に配信されます。

> **なぜ Actions でデプロイするのか**: 以前は手元でビルドして `gh-pages` ブランチへ
> push していましたが、それでは「公開されているソース」と「実際に配信されている
> コード」が一致する保証がありません。Actions 経由なら、ビルドログが公開されるため
> 「配信物＝このリポジトリのこのコミットのビルド結果」を第三者が検証できます。
> （アプリの信頼性・透明性の方針については [SECURITY.md](SECURITY.md) を参照）

> **なぜ単一HTMLビルドを配信するのか**: ライブサイトの「ファイル → 単体HTMLファイルに
> 出力」で書き出したファイルが `file://`（ダブルクリック）でそのまま動くようにするためです。
> 通常の分割ビルドは `<script type="module">` 形式で、`file://` では実行できません。
> 単一HTMLビルドはクラシックスクリプトに変換されるため、書き出したスナップショットも動作します。

## 前提条件（初回のみ）

1. GitHub リポジトリページで **Settings → Pages** を開く
2. **Build and deployment** の **Source** で **GitHub Actions** を選択
   （旧設定の「Deploy from a branch (`gh-pages`)」から切り替える）

## デプロイ（更新）

`master` へ push するだけです。

```bash
git push origin master
```

- `deploy.yml` が `npm ci` → `npm test` → `npm run build:singlefile` を実行し、
  `dist-single/` を Pages に公開します
- 手動で再デプロイしたい場合は、リポジトリの **Actions** タブから
  `Deploy to GitHub Pages` を **Run workflow** で起動できます
- 公開URLは `https://kloir-z.github.io/ganttapp-local/#/`（HashRouter のため `#/` が付きます）

## リリース（配布用単一HTMLの公開）

タグを push すると `release.yml` が GitHub Release を作成します。

```bash
git tag v1.1.0
git push origin v1.1.0
```

- 成果物: `gantt-local-v1.1.0.html`（単一HTML）と `SHA256SUMS.txt`
- ビルド来歴の証明（attestation）が付き、誰でも以下で検証できます:

```bash
gh attestation verify gantt-local-v1.1.0.html --repo kloir-z/ganttapp-local
```

## ローカルでの確認

配信されるものと同じ単一HTMLビルドで確認します:

```bash
npm run build:singlefile   # dist-single/index.html を生成
```

`dist-single/index.html` をブラウザで開けば、配信版と同じ挙動を確認できます
（ダブルクリックの `file://` でも動作します）。

CSP（Content-Security-Policy）下で全機能が動くことの自動検証:

```bash
node scripts/verify-csp.mjs           # 起動とCSP違反ゼロの確認
node scripts/verify-csp-export.mjs    # PDF / Excel / 単体HTML 出力の確認
node scripts/verify-exported-html.mjs # 書き出した単体HTML自身の起動確認
```

分割ビルド版（開発・プレビュー用）を確認する場合:

```bash
npm run build      # dist/ に出力（base: /ganttapp-local/）
npm run preview    # ローカルサーバーでプレビュー
```

## トラブルシューティング

### デプロイが反映されない場合

1. **Actions** タブで `Deploy to GitHub Pages` ワークフローが成功しているか確認
2. **Settings → Pages** の Source が **GitHub Actions** になっているか確認
3. 反映には数分かかる場合があります。ブラウザのキャッシュもクリアして確認
