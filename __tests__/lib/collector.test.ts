import { collectFromSource } from "@/lib/collector";

jest.mock("rss-parser", () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: jest.fn().mockResolvedValue({
      items: [
        {
          title: "New Lambda Feature",
          link: "https://aws.amazon.com/blogs/1",
          content: "AWS Lambda now supports new runtime...",
          isoDate: "2026-04-03T00:00:00Z",
        },
        {
          title: "S3 Update",
          link: "https://aws.amazon.com/blogs/2",
          content: "Amazon S3 introduces new storage class...",
          isoDate: "2026-04-02T00:00:00Z",
        },
      ],
    }),
  }));
});

describe("collectFromSource", () => {
  it("fetches and parses RSS feed items", async () => {
    const items = await collectFromSource("https://aws.amazon.com/blogs/aws/feed/");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "New Lambda Feature",
      url: "https://aws.amazon.com/blogs/1",
      content: "AWS Lambda now supports new runtime...",
      externalId: "https://aws.amazon.com/blogs/1",
      publishedAt: new Date("2026-04-03T00:00:00Z"),
    });
  });

  it("truncates content to 2000 characters", async () => {
    const RssParser = require("rss-parser");
    const mockInstance = new RssParser();
    mockInstance.parseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Long Article",
          link: "https://example.com/long",
          content: "x".repeat(3000),
          isoDate: "2026-04-03T00:00:00Z",
        },
      ],
    });
    const items = await collectFromSource("https://example.com/feed");
    expect(items[0].content.length).toBeLessThanOrEqual(2000);
  });
});
