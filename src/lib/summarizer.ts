import { execFile as execFileCb } from "child_process";
import { promisify } from "util";

const execFile = promisify(execFileCb);

interface ArticleInput {
  externalId: string;
  title: string | undefined;
  content: string;
}

export interface SummaryResult {
  externalId: string;
  summary: string;
  importance: number;
}

export function buildPrompt(articles: ArticleInput[]): string {
  const articleData = JSON.stringify(
    articles.map((a) => ({
      externalId: a.externalId,
      title: a.title || "(no title)",
      content: a.content,
    })),
    null,
    2
  );

  return `あなたは技術情報アナリストです。以下の技術記事を分析してください。

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

${articleData}`;
}

export async function summarizeArticles(
  articles: ArticleInput[]
): Promise<SummaryResult[]> {
  if (articles.length === 0) return [];

  const prompt = buildPrompt(articles);

  try {
    const { stdout } = await execFile(
      "claude",
      ["-p", prompt, "--output-format", "json"],
      { maxBuffer: 10 * 1024 * 1024, timeout: 120000 }
    );

    const cliResponse = JSON.parse(stdout);
    const resultText =
      typeof cliResponse.result === "string"
        ? cliResponse.result
        : JSON.stringify(cliResponse.result);

    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const results: SummaryResult[] = JSON.parse(jsonMatch[0]);
    return results.filter(
      (r) => r.externalId && r.summary && typeof r.importance === "number"
    );
  } catch (error) {
    console.error("Claude CLI summarization failed:", error);
    return [];
  }
}
