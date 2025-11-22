
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CoverEditor } from './components/CoverEditor';
import { ArticleManager } from './components/ArticleManager';
import { AppState, Article, Cover, CoverLayoutType, ArticleCategory, ArticleStatus, ArticleType } from './types';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Component for robust crash handling
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-100 text-slate-800">
           <div className="text-center p-8 bg-white rounded-xl shadow-xl border border-red-100 max-w-md">
             <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
             <p className="text-slate-500 mb-4">The application encountered an unexpected error. Please refresh.</p>
             <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-900 text-white rounded-lg">Refresh Page</button>
           </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Initial Mock Data
const INITIAL_ARTICLES: Article[] = [
  { id: '1', title: 'Local Team Wins Championship in Stunning Upset', subtitle: 'A historic night for the city', content: 'The stadium erupted in cheers as the final whistle blew...', category: ArticleCategory.SPORTS, type: ArticleType.FEATURE, status: ArticleStatus.PUBLISHED, imageUrl: 'https://picsum.photos/seed/sports/800/600', author: 'Bob', publishedAt: '2023-10-25' },
  { id: '2', title: 'New Economic Policies Spark Debate', subtitle: 'Experts divided on impact', content: 'The finance ministry announced a series of reforms today...', category: ArticleCategory.ECONOMY, type: ArticleType.STANDARD, status: ArticleStatus.PUBLISHED, imageUrl: 'https://picsum.photos/seed/econ/800/600', author: 'Alice', publishedAt: '2023-10-26' },
  { id: '3', title: 'Tech Giant Unveils Revolutionary AI Model', subtitle: 'The future of computing is here', content: 'In a surprise keynote, the CEO demonstrated capabilities...', category: ArticleCategory.TECH, type: ArticleType.BREAKING, status: ArticleStatus.PUBLISHED, imageUrl: 'https://picsum.photos/seed/tech/800/600', author: 'Dave', publishedAt: '2023-10-27' },
  { id: '4', title: 'Why We Need More Green Spaces', subtitle: 'An argument for urban planning', content: 'Cities are becoming concrete jungles, and it is affecting our mental health...', category: ArticleCategory.OPINION, type: ArticleType.OPINION, status: ArticleStatus.DRAFT, imageUrl: 'https://picsum.photos/seed/park/800/600', author: 'Eve', publishedAt: '2023-10-28' },
  { id: '5', title: 'Cultural Festival Draws Record Crowds', subtitle: 'Art and music take over downtown', content: 'Thousands gathered this weekend to celebrate diversity...', category: ArticleCategory.CULTURE, type: ArticleType.STANDARD, status: ArticleStatus.SCHEDULED, imageUrl: 'https://picsum.photos/seed/culture/800/600', author: 'Grace', publishedAt: '2023-10-29' },
];

const INITIAL_COVERS: Cover[] = [
  {
    id: 'c1',
    name: 'Morning Edition',
    date: new Date().toLocaleDateString(),
    layout: CoverLayoutType.CLASSIC,
    isPublished: true,
    slots: [
      { id: 's1', name: 'Main Headline', colSpan: 4, rowSpan: 2, articleId: '1' },
      { id: 's2', name: 'Secondary 1', colSpan: 2, rowSpan: 1, articleId: '2' },
      { id: 's3', name: 'Secondary 2', colSpan: 2, rowSpan: 1, articleId: '3' },
      { id: 's4', name: 'Footer Feature', colSpan: 4, rowSpan: 1, articleId: null },
    ]
  }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    articles: INITIAL_ARTICLES,
    covers: INITIAL_COVERS,
    activeCoverId: 'c1',
    view: 'COVERS'
  });

  // Feature: Create new cover
  const handleCreateCover = (name: string, layout: CoverLayoutType) => {
    let slots: any[] = [];
    const now = Date.now();

    switch (layout) {
      case CoverLayoutType.CLASSIC:
        slots = [
          { id: `s-${now}-1`, name: 'Main Lead', colSpan: 4, rowSpan: 2, articleId: null },
          { id: `s-${now}-2`, name: 'Side Story Left', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-3`, name: 'Side Story Right', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-4`, name: 'Bottom Banner', colSpan: 4, rowSpan: 1, articleId: null },
        ];
        break;
      case CoverLayoutType.MODERN:
        slots = [
          { id: `s-${now}-1`, name: 'Vertical Lead', colSpan: 2, rowSpan: 2, articleId: null },
          { id: `s-${now}-2`, name: 'Top Right', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-3`, name: 'Mid Right', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-4`, name: 'Bottom Full', colSpan: 4, rowSpan: 1, articleId: null },
        ];
        break;
      case CoverLayoutType.GRID:
        slots = [
          { id: `s-${now}-1`, name: 'Grid 1', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-2`, name: 'Grid 2', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-3`, name: 'Grid 3', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-4`, name: 'Grid 4', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-5`, name: 'Grid 5', colSpan: 2, rowSpan: 1, articleId: null },
          { id: `s-${now}-6`, name: 'Grid 6', colSpan: 2, rowSpan: 1, articleId: null },
        ];
        break;
      case CoverLayoutType.BANNER:
        slots = [
          { id: `s-${now}-1`, name: 'Banner Story', colSpan: 4, rowSpan: 1, articleId: null }
        ];
        break;
      case CoverLayoutType.HERO:
        slots = [
          { id: `s-${now}-1`, name: 'Hero Feature', colSpan: 4, rowSpan: 2, articleId: null }
        ];
        break;
      case CoverLayoutType.CUSTOM:
        // Start with a basic canvas of 4 slots
        slots = [
            { id: `s-${now}-1`, name: 'Custom Slot 1', colSpan: 4, rowSpan: 2, articleId: null },
            { id: `s-${now}-2`, name: 'Custom Slot 2', colSpan: 2, rowSpan: 1, articleId: null },
            { id: `s-${now}-3`, name: 'Custom Slot 3', colSpan: 2, rowSpan: 1, articleId: null },
        ];
        break;
    }

    const newCover: Cover = {
      id: `c-${now}`,
      name,
      date: new Date().toLocaleDateString(),
      layout,
      isPublished: false,
      slots
    };

    setState(prev => ({
      ...prev,
      covers: [...prev.covers, newCover],
      activeCoverId: newCover.id
    }));
  };

  const handleUpdateCover = (updatedCover: Cover) => {
    setState(prev => ({
      ...prev,
      covers: prev.covers.map(c => c.id === updatedCover.id ? updatedCover : c)
    }));
  };

  const handleAddArticle = (article: Article) => {
    setState(prev => ({
      ...prev,
      articles: [article, ...prev.articles]
    }));
  };

  const handleDeleteArticles = (ids: string[]) => {
    setState(prev => ({
      ...prev,
      articles: prev.articles.filter(a => !ids.includes(a.id)),
      // Clean up deleted articles from covers
      covers: prev.covers.map(c => ({
        ...c,
        slots: c.slots.map(s => s.articleId && ids.includes(s.articleId) ? { ...s, articleId: null } : s)
      }))
    }));
  };

  const handleUpdateArticleStatus = (ids: string[], status: ArticleStatus) => {
    setState(prev => ({
      ...prev,
      articles: prev.articles.map(a => ids.includes(a.id) ? { ...a, status } : a)
    }));
  };

  const handleReorderArticles = (reorderedArticles: Article[]) => {
    setState(prev => ({
      ...prev,
      articles: reorderedArticles
    }));
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
        <Sidebar 
          activeView={state.view} 
          onNavigate={(view) => setState(prev => ({ ...prev, view }))} 
        />
        
        <main className="flex-1 h-full min-w-0 overflow-hidden relative">
          {state.view === 'DASHBOARD' && (
            <div className="p-8 flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <h1 className="text-3xl font-serif text-slate-800 mb-2">Welcome to DiarioCMS</h1>
                <p>Select "Portadas" or "Articles" from the sidebar to begin.</p>
              </div>
            </div>
          )}

          {state.view === 'COVERS' && (
            <CoverEditor 
              covers={state.covers}
              articles={state.articles}
              activeCoverId={state.activeCoverId}
              onUpdateCover={handleUpdateCover}
              onCreateCover={handleCreateCover}
              onDeleteCover={() => {}}
              onSetActiveCover={(id) => setState(prev => ({ ...prev, activeCoverId: id }))}
            />
          )}

          {state.view === 'ARTICLES' && (
            <ArticleManager 
              articles={state.articles} 
              onAddArticle={handleAddArticle}
              onDeleteArticles={handleDeleteArticles}
              onUpdateArticleStatus={handleUpdateArticleStatus}
              onReorderArticles={handleReorderArticles}
            />
          )}

          {state.view === 'SETTINGS' && (
             <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Settings</h1>
                <p className="text-slate-600">API Configuration and user preferences go here.</p>
             </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;