
import React, { useState, useRef } from 'react';
import { Article, ArticleCategory, ArticleStatus, ArticleType } from '../types';
import { Plus, Search, Sparkles, Calendar, Trash2, CheckCircle, FileText, X, Tag, GripVertical, Filter, ChevronDown, Upload, Image as ImageIcon, Eye, RefreshCw, Copy } from 'lucide-react';
import { Button } from './ui/Button';
import { generateHeadline } from '../services/geminiService';

interface ArticleManagerProps {
  articles: Article[];
  onAddArticle: (article: Article) => void;
  onDeleteArticles: (ids: string[]) => void;
  onUpdateArticleStatus: (ids: string[], status: ArticleStatus) => void;
  onReorderArticles: (articles: Article[]) => void;
}

export const ArticleManager: React.FC<ArticleManagerProps> = ({ 
    articles, 
    onAddArticle, 
    onDeleteArticles, 
    onUpdateArticleStatus,
    onReorderArticles
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ArticleCategory>(ArticleCategory.POLITICS);
  const [type, setType] = useState<ArticleType>(ArticleType.STANDARD);
  const [status, setStatus] = useState<ArticleStatus>(ArticleStatus.DRAFT);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // List State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{id: string, position: 'top' | 'bottom'} | null>(null);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ArticleCategory | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<ArticleType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ArticleStatus | 'ALL'>('ALL');
  
  // Ref to track if the mouse is currently held down on a drag handle
  const dragEnabled = useRef(false);

  // Filter Logic
  const filteredArticles = articles.filter(article => {
      const matchesSearch = 
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'ALL' || article.category === filterCategory;
      const matchesType = filterType === 'ALL' || article.type === filterType;
      const matchesStatus = filterStatus === 'ALL' || article.status === filterStatus;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  const isFiltered = searchQuery !== '' || filterCategory !== 'ALL' || filterType !== 'ALL' || filterStatus !== 'ALL';

  const handleGenerateTitle = async () => {
    if (!content) return;
    setIsLoadingAi(true);
    const generated = await generateHeadline(content);
    setTitle(generated.replace(/"/g, '')); // remove quotes if any
    setIsLoadingAi(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newArticle: Article = {
      id: Date.now().toString(),
      title,
      subtitle: 'Automatically generated subtitle',
      content,
      category,
      type,
      status,
      imageUrl: imageUrl || `https://picsum.photos/seed/${Date.now()}/800/600`,
      author: 'Editor',
      publishedAt: new Date().toLocaleDateString(),
      aiGenerated: false
    };
    onAddArticle(newArticle);
    setIsEditing(false);
    setTitle('');
    setContent('');
    setImageUrl('');
    setStatus(ArticleStatus.DRAFT);
    setType(ArticleType.STANDARD);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredArticles.length && filteredArticles.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
      if (confirm(`Are you sure you want to delete ${selectedIds.size} articles?`)) {
          onDeleteArticles(Array.from(selectedIds));
          setSelectedIds(new Set());
      }
  };

  const handleBulkStatus = (newStatus: ArticleStatus) => {
      onUpdateArticleStatus(Array.from(selectedIds), newStatus);
      setSelectedIds(new Set());
  };

  const handleBulkDuplicate = () => {
      if (confirm(`Duplicate ${selectedIds.size} articles?`)) {
          const selectedArticles = articles.filter(a => selectedIds.has(a.id));
          selectedArticles.forEach(article => {
             onAddArticle({
                 ...article,
                 id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                 title: `${article.title} (Copy)`,
                 status: ArticleStatus.DRAFT,
                 publishedAt: new Date().toLocaleDateString(),
                 aiGenerated: false
             });
          });
          setSelectedIds(new Set());
      }
  };

  const clearFilters = () => {
      setSearchQuery('');
      setFilterCategory('ALL');
      setFilterType('ALL');
      setFilterStatus('ALL');
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
      // Disable drag if filtered (reordering only works on full list)
      if (isFiltered) {
          e.preventDefault();
          return;
      }

      // Only allow drag if initiated from the handle
      if (!dragEnabled.current) {
          e.preventDefault();
          return;
      }

      setDraggedId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id); // Required for Firefox
      
      // Clean visual for dragging
      const row = e.currentTarget as HTMLElement;
      row.style.opacity = '0.4';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault(); // Necessary to allow dropping
      if (!draggedId || draggedId === id) return;

      const row = e.currentTarget;
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'top' : 'bottom';

      // Debounce/Check to avoid unnecessary state updates
      if (dropTarget?.id !== id || dropTarget?.position !== position) {
          setDropTarget({ id, position });
      }
  };

  const handleDragEnd = (e: React.DragEvent) => {
      e.preventDefault();
      const row = e.currentTarget as HTMLElement;
      row.style.opacity = '1';
      
      setDraggedId(null);
      setDropTarget(null);
      dragEnabled.current = false;
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      
      if (!draggedId || !dropTarget) {
          handleDragEnd(e);
          return;
      }

      const sourceIndex = articles.findIndex(a => a.id === draggedId);
      const targetIndex = articles.findIndex(a => a.id === dropTarget.id);

      if (sourceIndex !== -1 && targetIndex !== -1) {
          const newArticles = [...articles];
          const [movedArticle] = newArticles.splice(sourceIndex, 1);
          
          let insertIndex = targetIndex;
          
          // Adjust insertion index based on removal and drop position
          if (sourceIndex < targetIndex) {
              insertIndex--; 
          }
          if (dropTarget.position === 'bottom') {
              insertIndex++;
          }
          
          newArticles.splice(insertIndex, 0, movedArticle);
          onReorderArticles(newArticles);
      }

      handleDragEnd(e);
  };

  const getStatusBadge = (status: ArticleStatus) => {
    let styles = "";
    let dotColor = "";
    
    switch (status) {
      case ArticleStatus.PUBLISHED:
        styles = "text-emerald-700 bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100/50";
        dotColor = "bg-emerald-500";
        break;
      case ArticleStatus.DRAFT:
        styles = "text-slate-600 bg-slate-50 border-slate-200 ring-1 ring-slate-100";
        dotColor = "bg-slate-400";
        break;
      case ArticleStatus.SCHEDULED:
        styles = "text-purple-700 bg-purple-50 border-purple-200 ring-1 ring-purple-100/50";
        dotColor = "bg-purple-500";
        break;
      default:
        styles = "text-slate-600 bg-slate-100";
        dotColor = "bg-slate-400";
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit transition-all shadow-sm ${styles}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col bg-slate-50/50 relative">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black font-serif text-slate-900 mb-2 tracking-tight">Editorial Content</h1>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
            Manage articles, drafts, and scheduled publications.
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)} icon={<Plus size={18} />} className="shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 transition-all">New Article</Button>
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-3xl mx-auto w-full animate-in slide-in-from-bottom-4">
           <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold font-serif text-slate-900">Compose Article</h2>
                    <p className="text-sm text-slate-400 mt-1">Create a new story for the edition.</p>
                </div>
                <div className="px-3 py-1 bg-slate-50 rounded text-xs font-mono text-slate-400 uppercase">Draft Mode</div>
           </div>
           
           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                    <div className="relative">
                        <select 
                        className="w-full appearance-none border-slate-200 rounded-lg shadow-sm p-3 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-700"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ArticleCategory)}
                        >
                        {Object.values(ArticleCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Type</label>
                    <div className="relative">
                        <select 
                        className="w-full appearance-none border-slate-200 rounded-lg shadow-sm p-3 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-700"
                        value={type}
                        onChange={(e) => setType(e.target.value as ArticleType)}
                        >
                        {Object.values(ArticleType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                    <div className="relative">
                        <select 
                        className="w-full appearance-none border-slate-200 rounded-lg shadow-sm p-3 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-700"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                        >
                        {Object.values(ArticleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Featured Image</label>
                <div className="flex gap-4 items-start">
                    <div className="w-32 h-20 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative group">
                        {imageUrl ? (
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon size={24} className="text-slate-300" />
                        )}
                        {imageUrl && (
                            <button 
                                type="button"
                                onClick={() => setImageUrl('')}
                                className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    className="w-full border-slate-200 rounded-lg shadow-sm pl-9 pr-3 py-2 border text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                                <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                             
                             <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
                                <Upload size={16} className="text-blue-600" />
                                <span>Upload</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                             </label>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                type="button"
                                onClick={() => setImageUrl(`https://picsum.photos/seed/${Date.now()}/800/600`)}
                                className="text-[11px] font-bold text-blue-600 hover:underline uppercase tracking-wide"
                             >
                                Generate Random
                             </button>
                        </div>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Headline</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    className="flex-1 border-slate-200 rounded-lg shadow-sm p-3 border font-bold font-serif text-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Enter a catchy headline"
                    required
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleGenerateTitle} 
                    disabled={!content}
                    isLoading={isLoadingAi}
                    icon={<Sparkles size={16} className="text-purple-600"/>}
                    title="Generate headline with AI"
                    className="bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-700 font-medium"
                  >
                    AI Suggest
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Content Body</label>
                <textarea 
                  className="w-full border-slate-200 rounded-lg shadow-sm p-4 border h-64 font-serif text-slate-700 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Start writing your article here..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit">Save Article</Button>
              </div>
           </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col relative">
           {/* Controls Bar */}
           <div className="px-6 py-4 border-b border-slate-100 bg-white z-20 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search articles by title, author..." 
                            className="w-full pl-10 pr-4 py-2 outline-none text-sm placeholder-slate-400 font-medium text-slate-700 bg-slate-50 rounded-md border border-slate-100 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search articles"
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-md border transition-all flex items-center gap-2 text-sm font-medium
                            ${showFilters || isFiltered
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-white border-transparent text-slate-400 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-600'
                            }
                        `}
                        aria-label="Toggle filters"
                    >
                        <Filter size={16} />
                        {isFiltered && <span className="text-xs bg-blue-200 px-1.5 rounded-full text-blue-800">!</span>}
                    </button>
                </div>

                {/* Expandable Filter Panel */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="relative">
                            <select 
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value as ArticleCategory | 'ALL')}
                                aria-label="Filter by Category"
                            >
                                <option value="ALL">All Categories</option>
                                {Object.values(ArticleCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        
                        <div className="relative">
                            <select 
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as ArticleType | 'ALL')}
                                aria-label="Filter by Type"
                            >
                                <option value="ALL">All Types</option>
                                {Object.values(ArticleType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select 
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as ArticleStatus | 'ALL')}
                                aria-label="Filter by Status"
                            >
                                <option value="ALL">All Statuses</option>
                                {Object.values(ArticleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="flex justify-end sm:justify-start">
                            <button 
                                onClick={clearFilters}
                                className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-2"
                                disabled={!isFiltered}
                            >
                                <RefreshCw size={12} /> Reset Filters
                            </button>
                        </div>
                    </div>
                )}
           </div>
           
           <div className="overflow-y-auto flex-1 pb-20 custom-scrollbar bg-slate-50/30">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/80 backdrop-blur border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="pl-6 py-3 w-[50px]"></th>
                    <th className="px-2 py-3 w-[50px]">
                         <div className="flex items-center justify-center">
                            <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer transition-all bg-slate-50"
                                checked={filteredArticles.length > 0 && selectedIds.size === filteredArticles.length}
                                onChange={toggleSelectAll}
                            />
                         </div>
                    </th>
                    <th className="px-4 py-3 w-[45%] text-left">Article Details</th>
                    <th className="px-4 py-3 text-left">Taxonomy</th>
                    <th className="px-4 py-3 text-left">Author</th>
                    <th className="pr-6 pl-4 py-3 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArticles.map(article => {
                    const isSelected = selectedIds.has(article.id);
                    const isDragged = draggedId === article.id;
                    const isDropTarget = dropTarget?.id === article.id;
                    const dropPosition = dropTarget?.position;

                    return (
                        <tr 
                            key={article.id} 
                            draggable={!isFiltered}
                            onDragStart={(e) => handleDragStart(e, article.id)}
                            onDragOver={(e) => handleDragOver(e, article.id)}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            className={`group transition-all duration-200 border-b border-slate-100 last:border-0 relative
                                ${isSelected 
                                    ? 'bg-blue-50/70 hover:bg-blue-50 border-blue-100 z-10' 
                                    : 'bg-white hover:bg-white hover:shadow-[0_4px_20px_-12px_rgba(0,0,0,0.15)] hover:z-10 hover:border-transparent hover:scale-[1.002]'} 
                                ${isDragged ? 'opacity-40 bg-slate-50 grayscale' : ''}
                                ${isDropTarget && dropPosition === 'top' ? 'shadow-[inset_0px_3px_0px_0px_#3b82f6] bg-blue-50/30' : ''}
                                ${isDropTarget && dropPosition === 'bottom' ? 'shadow-[inset_0px_-3px_0px_0px_#3b82f6] bg-blue-50/30' : ''}
                            `}
                        >
                        <td className="py-5 pl-6 w-[50px] align-middle">
                            <div 
                                className={`p-2 -ml-2 rounded transition-colors flex justify-center select-none
                                    ${isFiltered 
                                        ? 'text-slate-200 cursor-not-allowed' 
                                        : 'cursor-grab text-slate-300 group-hover:text-blue-500 active:cursor-grabbing hover:bg-slate-100'
                                    }
                                `}
                                onMouseDown={() => { if (!isFiltered) dragEnabled.current = true; }}
                                onMouseUp={() => { dragEnabled.current = false; }}
                                onMouseLeave={() => { dragEnabled.current = false; }}
                                title={isFiltered ? "Ordering disabled while filtering" : "Drag to reorder"}
                            >
                                <GripVertical size={16} />
                            </div>
                        </td>
                        <td className="py-5 px-2 w-[50px] align-middle">
                             <div className="flex items-center justify-center">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer transition-all bg-slate-50"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(article.id)}
                                />
                             </div>
                        </td>
                        <td className="py-5 px-4 align-middle">
                            <div className="flex gap-5 items-center">
                                <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm relative group-hover:shadow-md transition-all duration-300">
                                    <img src={article.imageUrl} className="w-full h-full object-cover" alt="" />
                                    {article.type === ArticleType.OPINION && (
                                        <div className="absolute inset-0 bg-amber-50/90 flex items-center justify-center">
                                            <span className="font-serif italic font-black text-amber-800 text-xs">Op</span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 max-w-md">
                                    <h3 className="font-serif font-bold text-slate-800 text-base leading-snug group-hover:text-blue-700 transition-colors mb-1.5 truncate">
                                        {article.title}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                                            <Calendar size={12} /> {article.publishedAt}
                                        </span>
                                        {article.aiGenerated && (
                                             <span className="text-[9px] font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                                                <Sparkles size={8} /> AI Generated
                                             </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="py-5 px-4 align-middle whitespace-nowrap">
                            <div className="flex flex-col gap-2 items-start">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200 group-hover:bg-white group-hover:border-blue-200 transition-colors">
                                {article.category}
                                </span>
                                {article.type !== ArticleType.STANDARD && (
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pl-1">
                                        <Tag size={10} /> {article.type}
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="py-5 px-4 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold shadow-sm">
                                    {article.author.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-700">{article.author}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">Editor</div>
                                </div>
                            </div>
                        </td>
                        <td className="py-5 pr-6 pl-4 align-middle text-right">
                            <div className="flex justify-end items-center gap-4">
                                {getStatusBadge(article.status)}
                                <div className="w-px h-4 bg-slate-200"></div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setPreviewArticle(article); }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all transform hover:scale-110 active:scale-95"
                                    title="Preview Article"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        </td>
                        </tr>
                    );
                  })}
                  {filteredArticles.length === 0 && (
                      <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-2">
                                  <Filter size={24} className="opacity-20" />
                                  <p className="text-sm font-medium">No articles match your filters.</p>
                                  <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">Clear Filters</button>
                              </div>
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
           </div>
           
           {/* Bulk Actions Floating Bar */}
           {selectedIds.size > 0 && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 shadow-2xl shadow-slate-900/50 text-white px-1 py-1.5 rounded-xl flex items-center gap-1 z-50 animate-in slide-in-from-bottom-4 border border-slate-700">
                <div className="px-4 flex items-center gap-2 border-r border-slate-700/50 pr-4 mr-1">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">{selectedIds.size}</div>
                    <span className="font-bold text-sm text-slate-200">Selected</span>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => handleBulkStatus(ArticleStatus.PUBLISHED)} className="px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-xs font-medium transition-all group" title="Publish Selected">
                        <CheckCircle size={14} className="text-emerald-400 group-hover:text-emerald-300" /> 
                        <span className="hidden sm:inline">Publish</span>
                    </button>
                    
                    <button onClick={() => handleBulkStatus(ArticleStatus.SCHEDULED)} className="px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-xs font-medium transition-all group" title="Schedule Selected">
                        <Calendar size={14} className="text-purple-400 group-hover:text-purple-300" />
                        <span className="hidden sm:inline">Schedule</span>
                    </button>

                    <button onClick={() => handleBulkStatus(ArticleStatus.DRAFT)} className="px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-xs font-medium transition-all group" title="Set to Draft">
                        <FileText size={14} className="text-slate-400 group-hover:text-slate-300" />
                        <span className="hidden sm:inline">Draft</span>
                    </button>

                    <div className="w-px h-4 bg-slate-700 mx-1"></div>

                    <button onClick={handleBulkDuplicate} className="px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-xs font-medium transition-all group" title="Duplicate Selected">
                        <Copy size={14} className="text-blue-400 group-hover:text-blue-300" />
                        <span className="hidden sm:inline">Clone</span>
                    </button>
                    
                    <button onClick={handleBulkDelete} className="px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center gap-2 text-xs font-medium transition-all" title="Delete Selected">
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                </div>

                <div className="pl-2 border-l border-slate-700/50 ml-1">
                    <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <X size={14} />
                    </button>
                </div>
             </div>
           )}
        </div>
      )}
      
      {/* Preview Modal */}
      {previewArticle && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setPreviewArticle(null)}
            ></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
                 {/* Modal Header */}
                 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white rounded-t-xl z-10">
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                           {previewArticle.category}
                        </span>
                        {getStatusBadge(previewArticle.status)}
                     </div>
                     <button 
                        onClick={() => setPreviewArticle(null)} 
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                     >
                        <X size={20} />
                     </button>
                 </div>

                 {/* Modal Body */}
                 <div className="overflow-y-auto p-8 sm:p-10 custom-scrollbar bg-white">
                     <article className="max-w-2xl mx-auto">
                        {previewArticle.imageUrl && (
                            <figure className="mb-8 rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50">
                                <img src={previewArticle.imageUrl} alt={previewArticle.title} className="w-full h-auto object-cover max-h-[400px]" />
                            </figure>
                        )}
                        
                        <h1 className="text-3xl sm:text-5xl font-black font-serif text-slate-900 leading-[1.1] mb-4">
                            {previewArticle.title}
                        </h1>
                        
                        <p className="text-lg sm:text-xl text-slate-600 font-serif leading-relaxed mb-8 font-medium">
                            {previewArticle.subtitle}
                        </p>
                        
                        <div className="flex items-center justify-between border-y border-slate-100 py-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                                   <img src={`https://ui-avatars.com/api/?name=${previewArticle.author}&background=random`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">By {previewArticle.author}</div>
                                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{previewArticle.publishedAt}</div>
                                </div>
                            </div>
                            {previewArticle.aiGenerated && (
                                <div className="flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                                    <Sparkles size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">AI Generated</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="font-serif text-lg text-slate-800 leading-relaxed space-y-6">
                            {previewArticle.content.split('\n').map((paragraph, i) => (
                                paragraph.trim() && <p key={i}>{paragraph}</p>
                            ))}
                        </div>
                     </article>
                 </div>
            </div>
         </div>
       )}
    </div>
  );
};
