# MorningBrief

技術情報を自動収集・AI要約して毎朝チェックできるダッシュボード。
RSSフィードから記事を取得し、Claude Code CLIで日本語要約と重要度スコアを生成します。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **データベース**: SQLite (better-sqlite3 + Drizzle ORM)
- **RSS解析**: rss-parser
- **AI要約**: Claude Code CLI (`claude -p`)
- **テスト**: Jest + ts-jest

## セットアップ

### 前提条件

- Node.js 18+
- Claude Code CLI がインストール済みで認証済みであること

### インストール

```bash
npm install
```

### データベース初期化

初回起動前にシードデータを投入します。AWS と Claude Code のカテゴリ・ソースが登録されます。

```bash
npm run seed
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でダッシュボードにアクセスできます。

### 本番ビルド・起動

```bash
npm run build
npm start
```

## 使い方

### 画面

| パス | 内容 |
|------|------|
| `/` | ダッシュボード - カテゴリタブで記事をフィルタ、重要度順に表示 |
| `/settings` | 設定 - カテゴリ・ソース（RSSフィード）の追加・編集・削除 |

### 記事の収集・更新

収集APIにPOSTリクエストを送ると、有効な全ソースからRSSを取得し、未要約の記事をClaude CLIで要約します。

```bash
curl -X POST http://localhost:3000/api/collect
```

要約処理を含むため、記事数によっては数分かかります。

### 定期実行（cron）

毎朝自動で記事を収集するには、cronを設定します。

```bash
crontab -e
```

```cron
0 7 * * * /usr/bin/curl -s -X POST http://localhost:3000/api/collect
```

### macOS で常時起動

`launchd` を使ってNext.jsサーバーを常時起動にできます。

## API

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/collect` | 記事収集・要約パイプラインを実行 |
| GET | `/api/articles?categoryId=...&sortBy=importance&limit=50&offset=0` | 記事一覧取得 |
| PATCH | `/api/articles/:id/read` | 記事を既読にする |
| GET/POST | `/api/categories` | カテゴリ一覧取得 / 作成 |
| PATCH/DELETE | `/api/categories/:id` | カテゴリ更新 / 削除 |
| GET/POST | `/api/sources` | ソース一覧取得 / 作成 |
| PATCH/DELETE | `/api/sources/:id` | ソース更新 / 削除 |

## テスト

```bash
npm test
```

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx                # ダッシュボード
│   ├── settings/page.tsx       # 設定画面
│   └── api/                    # APIエンドポイント
├── components/                 # UIコンポーネント
├── lib/
│   ├── schema.ts               # DBスキーマ定義
│   ├── db.ts                   # SQLiteクライアント
│   ├── collector.ts            # RSS収集ロジック
│   ├── summarizer.ts           # Claude CLI要約ロジック
│   └── seed.ts                 # シードデータ
└── types/                      # 型定義
```

## データ保持

90日以上前の記事は収集時に自動削除されます。
