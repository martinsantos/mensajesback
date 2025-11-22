
export enum ArticleCategory {
  POLITICS = 'Politics',
  SPORTS = 'Sports',
  CULTURE = 'Culture',
  ECONOMY = 'Economy',
  TECH = 'Technology',
  OPINION = 'Opinion',
  LIFESTYLE = 'Lifestyle',
  INTERNATIONAL = 'International',
  SCIENCE = 'Science'
}

export enum ArticleType {
  STANDARD = 'Standard',
  OPINION = 'Opinion',
  FEATURE = 'Feature',
  BREAKING = 'Breaking',
  ANALYSIS = 'Analysis',
  REVIEW = 'Review',
  EXPIRED = 'Expired'
}

export enum ArticleStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  SCHEDULED = 'Scheduled'
}

export enum CoverLayoutType {
  CLASSIC = 'CLASSIC', // 1 Main, 3 Sub
  MODERN = 'MODERN',   // 2 Main, 2 Sub
  GRID = 'GRID',       // 6 Equal grid
  CUSTOM = 'CUSTOM',   // User defined
  BANNER = 'BANNER',   // 1 Row, 4 Cols
  HERO = 'HERO'        // 2 Rows, 4 Cols
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  category: ArticleCategory;
  type: ArticleType;
  status: ArticleStatus;
  imageUrl: string;
  author: string;
  publishedAt: string;
  aiGenerated?: boolean;
}

export interface CoverSlot {
  id: string;
  name: string;
  articleId: string | null; // The ID of the article placed here
  colSpan: number; // For grid logic
  rowSpan: number;
}

export interface Cover {
  id: string;
  name: string; // e.g., "Morning Edition", "Sports Special"
  date: string;
  layout: CoverLayoutType;
  slots: CoverSlot[];
  isPublished: boolean;
}

export interface AppState {
  articles: Article[];
  covers: Cover[];
  activeCoverId: string | null;
  view: 'DASHBOARD' | 'ARTICLES' | 'COVERS' | 'SETTINGS';
}
