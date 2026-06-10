# セキュリティとデータの扱い / Security & Data Handling

[English follows the Japanese section.](#english)

## 方針

このアプリは**プロジェクトデータを一切外部に送信しません**。これは「約束」ではなく、
以下の手段で**第三者が自分で検証できる**ように設計しています。

- テレメトリ・アナリティクス・広告・トラッキングなし
- Cookie・アカウント・ログインなし
- データの保存先はユーザーが自分でダウンロードするファイル（ZIP / HTML）のみ

## 発生する通信の完全なリスト

| 通信 | 内容 |
|---|---|
| 同一オリジンへのアセット取得 | アプリ本体（初回ロード時のみ。単一HTML版はこれすらなし） |
| 同一オリジンへのサンプル取得 | ウェルカム画面のサンプルプロジェクト（ZIP）。`file://` で開いた場合は発生しない |

外部ドメインへの通信は**ゼロ**です。祝日データもビルド時にバンドルされており、
実行時に取得しません。

## 自分で検証する方法

1. **Content-Security-Policy を見る** — 配信される HTML の先頭に CSP メタタグが
   静的に埋め込まれており、**外部ドメインが一切含まれていません**
   （`connect-src 'self'`、`form-action 'none'` など）。つまり外部へのデータ送信は
   作者の善意ではなく**ブラウザ自身が遮断**します。ポリシーの定義は
   [`vite.config.ts`](vite.config.ts) にあります。
2. **DevTools の Network タブを開いたまま操作する** — ロード完了後、何を操作しても
   外部への通信は発生しません。
3. **オフラインで使う** — 機内モードでも全機能が動きます。単一HTML版は
   `file://`（ダブルクリック）で開けます。
4. **配信物とソースの一致を確認する** — デプロイは GitHub Actions
   （[`deploy.yml`](.github/workflows/deploy.yml)）で行われ、ビルドログは公開されます。
   リリース成果物には build provenance（来歴証明）が付与され、次のコマンドで
   「このリポジトリのこのコミットから GitHub 上でビルドされた」ことを検証できます:

   ```bash
   gh attestation verify gantt-local-vX.Y.Z.html --repo kloir-z/ganttapp-local
   ```

   `SHA256SUMS.txt` でハッシュ照合もできます。
5. **それでも信用できない場合はソースから自分でビルドする**:

   ```bash
   git clone https://github.com/kloir-z/ganttapp-local.git
   cd ganttapp-local
   npm ci
   npm run build:singlefile   # dist-single/index.html が配布物と同等のもの
   ```

## サプライチェーン対策

- 依存パッケージは `package-lock.json` で固定し、Dependabot で更新・脆弱性を監視
- CI（GitHub Actions）で lint / test / build を毎 push 検証
- CSP に `connect-src 'self'` があるため、仮に依存パッケージが汚染されても
  実行時に外部へデータを送ることはブラウザが遮断します

## 脆弱性の報告

セキュリティ上の問題を見つけた場合は、GitHub の
[Security Advisories](https://github.com/kloir-z/ganttapp-local/security/advisories/new)
から非公開で報告してください。軽微なものは Issue でも構いません。

---

<a id="english"></a>

# English

## Policy

This app **never sends your project data anywhere**. This is not a promise to take
on faith — it is designed to be **independently verifiable**:

- No telemetry, analytics, ads, or tracking
- No cookies, no accounts, no login
- Data is persisted only as files you download yourself (ZIP / HTML)

## Complete list of network requests

| Request | Purpose |
|---|---|
| Same-origin asset fetch | The app itself (first load only; the single-file build has none at all) |
| Same-origin sample fetch | Sample projects (ZIP) on the welcome screen; never happens when opened via `file://` |

There are **zero** requests to external domains. Holiday data is bundled at build
time, not fetched at runtime.

## How to verify it yourself

1. **Read the Content-Security-Policy** — a static CSP meta tag at the top of the
   served HTML contains **no external domains** (`connect-src 'self'`,
   `form-action 'none'`, …), so exfiltration is blocked by the browser itself,
   not by the author's good intentions. The policy is defined in
   [`vite.config.ts`](vite.config.ts).
2. **Keep the DevTools Network tab open** — after load, no external request is
   made no matter what you do.
3. **Use it offline** — everything works in airplane mode; the single-file build
   opens via `file://` (double-click).
4. **Verify that the deployed code matches the source** — deployment runs on
   GitHub Actions ([`deploy.yml`](.github/workflows/deploy.yml)) with public build
   logs. Release artifacts carry build provenance attestations:

   ```bash
   gh attestation verify gantt-local-vX.Y.Z.html --repo kloir-z/ganttapp-local
   ```

   `SHA256SUMS.txt` is included for hash verification.
5. **Still don't trust it? Build from source:**

   ```bash
   git clone https://github.com/kloir-z/ganttapp-local.git
   cd ganttapp-local
   npm ci
   npm run build:singlefile   # dist-single/index.html is equivalent to the distributed file
   ```

## Supply-chain measures

- Dependencies are pinned via `package-lock.json` and monitored by Dependabot
- CI (GitHub Actions) runs lint / test / build on every push
- Because the CSP includes `connect-src 'self'`, even a compromised dependency
  cannot exfiltrate data at runtime — the browser blocks it

## Reporting a vulnerability

Please report security issues privately via GitHub
[Security Advisories](https://github.com/kloir-z/ganttapp-local/security/advisories/new).
Minor issues are fine as regular Issues.
