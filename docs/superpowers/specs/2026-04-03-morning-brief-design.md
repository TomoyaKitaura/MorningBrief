# MorningBrief 設計仕様書

## 概要

技術情報キャッチアップのための個人用モーニングダッシュボード。公式ブログやリリースノートのRSSフィードから情報を収集し、Claude Code CLI（`claude -p`）で要約・重要度スコアリングを行い、見やすいWeb UIで表示する。Maxサブスクリプションの認証をそのまま利用するため、別途APIキーは不要。

ローカル環境でNext.js単一プロセス + SQLiteで動作する。

## 要件

- **技術情報キャッチアップ**: AWS、Claude Codeなどの公式情報をRSSフィードから収集
- **柔軟なカテゴリ管理**: 設定画面からカテゴリとソースを簡単に追加・削除
- **AI要約**: 各記事に日本語の要約（1-2文）と重要度スコア（1-5）を付与（Claude Code CLI経由、Maxサブスクリプション認証）
- **定時収集**: 毎朝7:00にcronでAPI Routeを叩いて自動収集
- **ローカル運用**: 自分のマシンで動作、クラウドホスティング不要
- **見やすいUI**: カテゴリフィルタ・重要度ソート付きのWebダッシュボード

## アーキテクチャ

```
Next.js App（単一プロセス）
├── React UI（App Router）
├── API Routes（収集、記事、カテゴリ、ソース）
├── SQLite（Prisma経由）
└── 収集パイプライン（RSSフィード取得）
    └── Claude Code CLI（claude -p）で要約生成
```

OS cronが毎朝7:00に `POST /api/collect` を呼び出す。収集パイプラインがRSSフィードから新着記事を取得し、externalIdで重複チェック後、`claude -p` コマンドで要約と重要度スコアを生成する。

## データモデル

### Category（カテゴリ）

| フィールド | 型       | 説明                            |
|-----------|----------|---------------------------------|
| id        | String   | UUID                            |
| name      | String   | 表示名（"AWS", "Claude Code"等） |
| slug      | String   | URL用識別子                      |
| createdAt | DateTime | 作成日時                         |
| updatedAt | DateTime | 更新日時                         |

### Source（情報ソース）

| フィールド  | 型       | 説明                                    |
|------------|----------|-----------------------------------------|
| id         | String   | UUID                                    |
| categoryId | String   | Category外部キー                         |
| name       | String   | 表示名（"AWS公式ブログ", "Anthropicブログ"等） |
| url        | String   | RSSフィードURL                           |
| enabled    | Boolean  | 有効/無効フラグ                           |
| createdAt  | DateTime | 作成日時                                 |
| updatedAt  | DateTime | 更新日時                                 |

### Article（記事）

| フィールド   | 型         | 説明                              |
|-------------|------------|-----------------------------------|
| id          | String     | UUID                              |
| sourceId    | String     | Source外部キー                     |
| externalId  | String     | 重複防止キー（記事URL）             |
| title       | String?    | 記事タイトル                       |
| content     | String     | 元のテキスト                       |
| url         | String     | 元記事へのリンク                    |
| summary     | String?    | AI生成の日本語要約                  |
| importance  | Int        | 1-5のAI判定重要度（デフォルト: 0）   |
| publishedAt | DateTime   | 元記事の公開日時                    |
| collectedAt | DateTime   | 収集日時                           |
| readAt      | DateTime?  | 既読日時（null=未読）               |

### リレーション

- Category 1:N Source（1カテゴリに複数ソース）
- Source 1:N Article（1ソースに複数記事）

## 収集パイプライン

### フロー

1. `POST /api/collect` がcronから呼ばれる
2. DBから有効な（`enabled=true`）Source一覧を取得
3. 各ソースのRSSフィードを `rss-parser` で取得
4. `externalId`（記事URL）で重複チェック、新規のみDB保存
5. DBから未要約の記事（`summary IS NULL`）も取得（前回失敗分のリトライ）
6. 新規記事＋未要約記事をカテゴリごとにバッチ化して `claude -p` で要約生成
7. Claude Code CLIが各記事の日本語要約と重要度スコアを返す
8. 要約とスコアをDBに保存
9. `collectedAt` が90日以上前の記事を削除（データクリーンアップ）

### エラーハンドリング

- **ソース単位で独立処理**: 1つのソースが失敗しても他のソースの収集は継続
- **RSSフィード取得失敗**: エラーログ出力してスキップ、次回収集時に再取得
- **Claude CLI失敗**: 記事は `importance: 0`, `summary: null` で保存し、次回収集時に未要約記事を再処理
- **部分的な結果もコミット**: 全体がアトミックでなくてよい

### Claude Code CLI利用

`claude -p` コマンドで要約を生成する。Maxサブスクリプションの認証をそのまま利用するため、APIキー不要。

- **実行方法**: `child_process.execFile` で `claude` コマンドを呼び出す
- **バッチサイズ**: カテゴリごとに最大10記事ずつ
- **記事コンテンツ**: 1記事あたり最大2,000文字に切り詰め
- **コマンド例**:

```bash
claude -p "プロンプト内容" --output-format json
```

- **プロンプト**: 記事データとプロンプトをまとめて `-p` に渡す

```
あなたは技術情報アナリストです。以下の技術記事を分析してください。

各記事について以下を返してください：
1. 日本語での要約（1-2文、技術者向け）
2. 重要度スコア（1-5）

重要度の基準：
- 5: 破壊的変更、重大なセキュリティ更新、主要な新機能リリース
- 4: 重要な機能追加、パフォーマンス改善、非推奨化の通知
- 3: 一般的な機能更新、ツールの改善
- 2: マイナーな修正、ドキュメント更新
- 1: コミュニティ記事、イベント告知

以下のJSON形式のみ返してください（それ以外のテキストは不要）：
[
  {
    "externalId": "記事の識別子",
    "summary": "日本語の要約",
    "importance": 数値
  }
]

## 記事データ

[
  {
    "externalId": "https://aws.amazon.com/blogs/...",
    "title": "記事タイトル",
    "content": "記事本文（最大2,000文字に切り詰め）"
  }
]
```

- **レスポンス形式**: `--output-format json` で返されるJSON内のテキストからJSON配列をパース

### 情報ソースの例

| カテゴリ     | ソース名            | RSSフィードURL                        |
|-------------|--------------------|-----------------------------------------|
| AWS         | AWS公式ブログ       | aws.amazon.com/blogs のRSSフィード       |
| AWS         | AWS What's New      | aws.amazon.com/about-aws/whats-new RSS  |
| Claude Code | Anthropicブログ     | anthropic.com/blog のRSSフィード         |

## APIルート

### エンドポイント一覧

| メソッド | パス                         | 用途                     |
|---------|------------------------------|--------------------------|
| POST    | `/api/collect`               | 収集パイプライン実行       |
| GET     | `/api/articles`              | 記事一覧取得              |
| PATCH   | `/api/articles/[id]/read`    | 既読マーク                |
| GET     | `/api/categories`            | カテゴリ一覧              |
| POST    | `/api/categories`            | カテゴリ追加              |
| PATCH   | `/api/categories/[id]`       | カテゴリ編集              |
| DELETE  | `/api/categories/[id]`       | カテゴリ削除（配下も削除） |
| GET     | `/api/sources`               | ソース一覧                |
| POST    | `/api/sources`               | ソース追加                |
| PATCH   | `/api/sources/[id]`          | ソース更新                |
| DELETE  | `/api/sources/[id]`          | ソース削除                |

### `GET /api/articles` クエリパラメータ

| パラメータ  | 型      | 必須 | デフォルト    | 説明                          |
|------------|---------|------|--------------|-------------------------------|
| categoryId | String  | No   | -            | カテゴリIDでフィルタ            |
| read       | Boolean | No   | -            | true=既読のみ, false=未読のみ   |
| sortBy     | String  | No   | "importance" | "importance"（降順）or "publishedAt"（降順） |
| limit      | Int     | No   | 50           | 取得件数                       |
| offset     | Int     | No   | 0            | スキップ件数                    |

### `GET /api/articles` レスポンス

```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "記事タイトル",
      "content": "元テキスト",
      "url": "https://...",
      "summary": "AI要約",
      "importance": 5,
      "publishedAt": "2026-04-03T00:00:00Z",
      "collectedAt": "2026-04-03T07:00:00Z",
      "readAt": null,
      "source": {
        "id": "uuid",
        "name": "AWS公式ブログ"
      },
      "category": {
        "id": "uuid",
        "name": "AWS",
        "slug": "aws"
      }
    }
  ],
  "total": 100
}
```

## フロントエンド

### 画面構成

**ダッシュボード (`/`)**

```
┌─────────────────────────────────────────┐
│  MorningBrief          最終更新: 7:00   │
├─────────────────────────────────────────┤
│  [全て] [AWS] [Claude Code] [+追加]     │  ← カテゴリタブ
├─────────────────────────────────────────┤
│  ★★★★★ AWSがLambdaの新機能を発表       │
│  要約: Lambda関数のコールドスタートが...   │
│  AWS公式ブログ · 2時間前     [元記事→]   │
├─────────────────────────────────────────┤
│  ★★★★☆ Claude Code v2.1 リリース        │
│  要約: 新しいMCPサーバー統合が...         │
│  Anthropicブログ · 5時間前   [元記事→]   │
├─────────────────────────────────────────┤
│  ...                                    │
└─────────────────────────────────────────┘
```

- カテゴリタブでフィルタ
- 重要度順にソート（デフォルト）
- 未読記事は太字表示
- 記事カードをクリックすると既読マークし、元記事を新しいタブで開く
- ページネーション対応（50件ずつ）

**設定画面 (`/settings`)**

- カテゴリのCRUD（追加・編集・削除）
- ソースのCRUD（カテゴリごとにRSSフィードURLを管理）
- ソースごとの有効/無効切り替え

### UIスタック

- **Tailwind CSS** でスタイリング
- コンポーネントライブラリは使わず軽量に保つ

## ディレクトリ構成

```
MorningBrief/
├── src/
│   ├── app/
│   │   ├── page.tsx                # ダッシュボード
│   │   ├── settings/
│   │   │   └── page.tsx            # 設定画面
│   │   ├── api/
│   │   │   ├── collect/route.ts    # 収集パイプライン
│   │   │   ├── articles/
│   │   │   │   ├── route.ts        # 記事一覧
│   │   │   │   └── [id]/
│   │   │   │       └── read/route.ts  # 既読マーク
│   │   │   ├── categories/
│   │   │   │   ├── route.ts        # カテゴリ一覧・追加
│   │   │   │   └── [id]/route.ts   # カテゴリ編集・削除
│   │   │   └── sources/
│   │   │       ├── route.ts        # ソース一覧・追加
│   │   │       └── [id]/route.ts   # ソース更新・削除
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ArticleCard.tsx         # 記事カード
│   │   ├── CategoryTabs.tsx        # カテゴリタブ
│   │   ├── CategoryForm.tsx        # カテゴリ追加・編集フォーム
│   │   └── SourceForm.tsx          # ソース追加・編集フォーム
│   ├── lib/
│   │   ├── db.ts                   # Prismaクライアント
│   │   ├── collector.ts            # RSS収集ロジック
│   │   └── summarizer.ts           # Claude Code CLI要約ロジック
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

## 主要ライブラリ

| ライブラリ / ツール    | 用途                |
|----------------------|---------------------|
| `next`               | フレームワーク       |
| `prisma` + `@prisma/client` | ORM + SQLite |
| `claude` CLI         | AI要約生成（Maxサブスクリプション認証） |
| `rss-parser`         | RSSフィード取得      |
| `tailwindcss`        | スタイリング         |

## 運用

### cron設定

```bash
# crontab -e
0 7 * * * /usr/bin/curl -s -X POST http://localhost:3000/api/collect
```

### プロセス管理

Next.jsをビルドして `next start` で起動。macOSの場合は `launchd` を使って常時起動を推奨：

```xml
<!-- ~/Library/LaunchAgents/com.morningbrief.plist -->
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.morningbrief</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>node_modules/.bin/next</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/MorningBrief</string>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

※ `/opt/homebrew/bin/node` は環境に合わせて `which node` の結果に置き換える。

### データ保持

- `collectedAt` が90日以上前の記事は収集時に自動削除
- SQLiteファイルはプロジェクトルートの `prisma/dev.db`

### 環境変数

```
DATABASE_URL="file:./dev.db"
```

※ Claude Code CLIはMaxサブスクリプションのOAuth認証を使用するため、APIキーは不要。`claude` コマンドがPATH上にあり、認証済みであること。
