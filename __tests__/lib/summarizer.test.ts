import { buildPrompt } from "@/lib/summarizer";

describe("buildPrompt", () => {
  it("builds prompt with article data", () => {
    const articles = [
      { externalId: "https://example.com/1", title: "Test Article", content: "Some content" },
    ];
    const prompt = buildPrompt(articles);
    expect(prompt).toContain("技術情報アナリスト");
    expect(prompt).toContain("https://example.com/1");
    expect(prompt).toContain("Test Article");
  });

  it("includes all articles in prompt", () => {
    const articles = [
      { externalId: "url-1", title: "Article 1", content: "Content 1" },
      { externalId: "url-2", title: "Article 2", content: "Content 2" },
    ];
    const prompt = buildPrompt(articles);
    expect(prompt).toContain("url-1");
    expect(prompt).toContain("url-2");
  });

  it("handles articles with no title", () => {
    const articles = [
      { externalId: "url-1", title: undefined, content: "Content" },
    ];
    const prompt = buildPrompt(articles);
    expect(prompt).toContain("(no title)");
  });
});
