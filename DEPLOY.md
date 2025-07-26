# GitHub Pages デプロイ手順

このアプリケーションをGitHub Pagesで公開するための手順です。

## 前提条件

- GitHubアカウント
- このリポジトリがGitHubにプッシュされていること

## セットアップ手順

### 1. GitHub Pages の有効化

1. GitHubリポジトリページで **Settings** タブを開く
2. 左側メニューから **Pages** を選択
3. **Source** で **GitHub Actions** を選択
4. **Save** をクリック

### 2. ワークフローの実行

1. `master` ブランチにコードをプッシュ
2. **Actions** タブで自動デプロイの状況を確認
3. デプロイ完了後、以下のURLでアクセス可能：
   ```
   https://[username].github.io/gantt-local-oss/
   ```

### 3. カスタムドメイン（オプション）

独自ドメインを使用する場合：

1. GitHub Pages設定で **Custom domain** を入力
2. DNSレコードを設定
3. **Enforce HTTPS** を有効化

## ローカルでのテスト

GitHub Pages環境をローカルで確認：

```bash
# GitHub Pages用ビルド
npm run build:gh-pages

# ローカルサーバーで確認
npm run preview
```

## トラブルシューティング

### デプロイが失敗する場合

1. **Actions** タブでエラーログを確認
2. Node.jsバージョンの互換性をチェック
3. 依存関係の問題がないか確認

### アセットが読み込まれない場合

1. `vite.config.ts` の `base` パスが正しいか確認
2. リポジトリ名と一致しているかチェック

### パフォーマンスの最適化

- 大きなアセットは別途CDNを検討
- 必要に応じてコード分割を実装
- キャッシュ戦略を調整

## セキュリティ注意事項

- 機密情報をリポジトリに含めない
- 環境変数は GitHub Secrets を使用
- 定期的に依存関係をアップデート