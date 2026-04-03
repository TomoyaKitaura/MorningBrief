export interface ArticleResponse {
  id: string;
  title: string | null;
  content: string;
  url: string;
  summary: string | null;
  importance: number;
  publishedAt: string;
  collectedAt: string;
  readAt: string | null;
  source: { id: string; name: string };
  category: { id: string; name: string; slug: string };
}

export interface ArticlesListResponse {
  articles: ArticleResponse[];
  total: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceResponse {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
