
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cover, Article, CoverSlot, CoverLayoutType, ArticleType } from '../types';
import { Plus, Layout, X, Wand2, Save, Eye, Columns, Grid, RectangleHorizontal, Trash2, Calendar, ChevronRight, Check, Settings2, PenTool, GripVertical, Scaling, MonitorPlay, Type, Newspaper, AlignLeft, AlignCenter, Quote, Square, MousePointer2, FileText, AlertTriangle, Ban, MoveHorizontal, ArrowLeftRight } from 'lucide-react';
import { Button } from './ui/Button';
import { suggestCoverLayout } from '../services/geminiService';

interface CoverEditorProps {
  covers: Cover[];
  articles: Article[];
  activeCoverId: string | null;
  onUpdateCover: (cover: Cover) => void;
  onCreateCover: (name: string, layout: CoverLayoutType) => void;
  onDeleteCover: (id: string) => void;
  onSetActiveCover: (id: string) => void;
}

// Helper for grid logic
const analyzeGrid = (slots: CoverSlot[]) => {
    let currentRowWidth = 0;
    let gaps = 0;
    
    slots.forEach(slot => {
        if (currentRowWidth + slot.colSpan > 4) {
             if (currentRowWidth < 4) {
                 gaps += (4 - currentRowWidth);
             }
             currentRowWidth = slot.colSpan;
        } else {
            currentRowWidth += slot.colSpan;
        }
    });
    
    const isComplete = currentRowWidth === 4;
    const remainingInRow = 4 - currentRowWidth;
    
    return { isComplete, remainingInRow: remainingInRow === 0 ? 4 : remainingInRow, totalGaps: gaps };
};

// Enhanced visual representation of layouts
const LayoutThumbnail = ({ type, selected }: { type: CoverLayoutType, selected: boolean }) => {
    const containerClass = `w-full aspect-[3/4] border rounded-md p-1.5 grid gap-1 transition-all duration-200 ${
        selected 
        ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-300' 
        : 'border-slate-200 bg-white hover:border-slate-400'
    }`;
    
    const blockClass = (active: boolean = false) => 
        `rounded-[1px] ${active ? 'bg-slate-600' : 'bg-slate-200'}`;

    if (type === CoverLayoutType.CLASSIC) {
        return (
            <div className={`${containerClass} grid-cols-4 grid-rows-4`}>
                <div className={`col-span-4 row-span-2 ${blockClass(selected)}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-4 row-span-1 ${blockClass()}`}></div>
            </div>
        );
    }
    if (type === CoverLayoutType.MODERN) {
        return (
            <div className={`${containerClass} grid-cols-4 grid-rows-3`}>
                <div className={`col-span-2 row-span-2 ${blockClass(selected)}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-4 row-span-1 ${blockClass()}`}></div>
            </div>
        );
    }
    if (type === CoverLayoutType.GRID) {
        return (
            <div className={`${containerClass} grid-cols-4 grid-rows-3`}>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
                <div className={`col-span-2 row-span-1 ${blockClass()}`}></div>
            </div>
        );
    }
    if (type === CoverLayoutType.BANNER) {
        return (
            <div className={`${containerClass} grid-cols-4 grid-rows-4`}>
                <div className={`col-span-4 row-span-1 ${blockClass(selected)}`}></div>
                <div className="col-span-4 row-span-3"></div>
            </div>
        );
    }
    if (type === CoverLayoutType.HERO) {
        return (
            <div className={`${containerClass} grid-cols-4 grid-rows-2`}>
                <div className={`col-span-4 row-span-2 ${blockClass(selected)}`}></div>
            </div>
        );
    }
    // CUSTOM
    return (
        <div className={`${containerClass} grid-cols-4 grid-rows-4 relative border-dashed border-2 border-slate-300`}>
             <div className="absolute inset-0 flex items-center justify-center">
                <PenTool size={20} className="text-slate-400" />
             </div>
             <div className="col-span-4 row-span-1 bg-slate-100 opacity-50"></div>
             <div className="col-span-2 row-span-2 bg-slate-100 opacity-50"></div>
        </div>
    );
};

const getLayoutIcon = (type: CoverLayoutType) => {
    switch (type) {
        case CoverLayoutType.CLASSIC: return <Layout size={14} />;
        case CoverLayoutType.MODERN: return <Columns size={14} />;
        case CoverLayoutType.GRID: return <Grid size={14} />;
        case CoverLayoutType.BANNER: return <RectangleHorizontal size={14} />;
        case CoverLayoutType.HERO: return <Square size={14} />;
        case CoverLayoutType.CUSTOM: return <PenTool size={14} />;
    }
};

const getLayoutLabel = (type: CoverLayoutType) => {
    switch (type) {
        case CoverLayoutType.CLASSIC: return "Classic";
        case CoverLayoutType.MODERN: return "Modern";
        case CoverLayoutType.GRID: return "Grid";
        case CoverLayoutType.BANNER: return "Banner";
        case CoverLayoutType.HERO: return "Hero";
        case CoverLayoutType.CUSTOM: return "Custom";
    }
};

// Interactive Grid Builder Component
const GridSlotBuilder = ({ onAdd, remainingSpace }: { onAdd: (cols: number, rows: number) => void, remainingSpace: number }) => {
    const [selection, setSelection] = useState({ cols: 1, rows: 1 });
    const [isDragging, setIsDragging] = useState(false);
    
    // 4 columns max (standard grid), 4 rows max (reasonable limit for single slot)
    const grid = Array(4).fill(0).map(() => Array(4).fill(0));

    const handleMouseDown = (c: number, r: number) => {
        setIsDragging(true);
        setSelection({ cols: c, rows: r });
    };

    const handleMouseEnter = (c: number, r: number) => {
        setSelection({ cols: c, rows: r });
    };

    // Only allow addition if it fits the remaining space. 
    // Note: If remainingSpace is 4, we are on a new row, so anything fits (up to 4).
    // If remainingSpace < 4, we must fit within it.
    const isValid = selection.cols <= remainingSpace;

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            if (isValid) {
                onAdd(selection.cols, selection.rows);
            }
            setSelection({ cols: 1, rows: 1 });
        }
    };

    // Handle click without drag
    const handleClick = (c: number, r: number) => {
        if (!isDragging && isValid) {
            onAdd(c, r);
        }
    };

    return (
        <div 
            className={`col-span-4 min-h-[200px] flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-colors select-none group relative
                ${!isValid && isDragging 
                    ? 'border-red-300 bg-red-50 cursor-not-allowed' 
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-crosshair'
                }
            `}
            onMouseLeave={() => {
                setIsDragging(false);
                setSelection({ cols: 1, rows: 1 });
            }}
            onMouseUp={handleMouseUp}
        >
            <div className="flex flex-col items-center gap-1 mb-4 group-hover:text-blue-600 transition-colors text-slate-400">
                <div className={`flex items-center gap-2 ${!isValid && isDragging ? 'text-red-500' : ''}`}>
                    {isValid ? (
                         <MousePointer2 size={20} className={isDragging ? "animate-bounce" : ""} />
                    ) : (
                         <Ban size={20} />
                    )}
                    <span className="text-sm font-bold uppercase tracking-wider">
                        {isDragging 
                            ? isValid 
                                ? `Release to create ${selection.cols}x${selection.rows}` 
                                : 'Invalid Placement' 
                            : 'Draw new slot'
                        }
                    </span>
                </div>
                {isDragging && !isValid && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={10} />
                        Cannot fit in current row (Max {remainingSpace})
                    </span>
                )}
                {isDragging && isValid && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check size={10} />
                        Fits current row
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-4 gap-2 p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                {grid.map((row, rIndex) => (
                    row.map((_, cIndex) => {
                        const r = rIndex + 1;
                        const c = cIndex + 1;
                        const isActive = c <= selection.cols && r <= selection.rows;
                        const isOutline = c === selection.cols && r === selection.rows;
                        
                        return (
                            <div 
                                key={`${r}-${c}`}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded border-2 transition-all duration-75 relative ${
                                    isActive 
                                        ? !isValid 
                                            ? 'bg-red-100 border-red-300' 
                                            : 'bg-blue-500 border-blue-600 shadow-sm' 
                                        : 'bg-slate-50 border-slate-100 hover:border-blue-200'
                                }`}
                                onMouseDown={() => handleMouseDown(c, r)}
                                onMouseEnter={() => handleMouseEnter(c, r)}
                                onClick={() => handleClick(c, r)}
                            >
                                {isOutline && (
                                    <div className={`absolute -bottom-2 -right-2 text-[9px] font-bold px-1 rounded border shadow-sm z-10 pointer-events-none whitespace-nowrap
                                        ${!isValid ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-blue-600 border-blue-100'}
                                    `}>
                                        {c}x{r}
                                    </div>
                                )}
                            </div>
                        )
                    })
                ))}
            </div>
            <div className="absolute top-4 right-4">
                 <div className={`text-[10px] font-mono px-1.5 rounded ${remainingSpace < 4 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-200 text-slate-400'}`}>
                    Remaining: {remainingSpace}/4
                 </div>
            </div>
        </div>
    );
};

export const CoverEditor: React.FC<CoverEditorProps> = ({
  covers,
  articles,
  activeCoverId,
  onUpdateCover,
  onCreateCover,
  onDeleteCover,
  onSetActiveCover
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCoverName, setNewCoverName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<CoverLayoutType>(CoverLayoutType.CLASSIC);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Layout Editor State
  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [resizingSlot, setResizingSlot] = useState<string | null>(null);
  const [resizingColumnSlotId, setResizingColumnSlotId] = useState<string | null>(null);
  const [resizeError, setResizeError] = useState<string | null>(null);

  // Drag and Drop State
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragGhostRef = useRef<HTMLDivElement>(null);

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const activeCover = covers.find(c => c.id === activeCoverId) || null;

  const gridAnalysis = useMemo(() => analyzeGrid(activeCover?.slots || []), [activeCover]);

  // Analyze layout for column neighbors
  const slotLayoutMap = useMemo(() => {
    if (!activeCover) return {};
    const map: Record<string, string | null> = {};
    let currentCol = 1;
    
    activeCover.slots.forEach((slot, index) => {
         if (currentCol > 4) currentCol = 1;
         
         // Look ahead to find if there's a neighbor on the same row
         if (index + 1 < activeCover.slots.length) {
             const nextSlot = activeCover.slots[index + 1];
             const currentEnd = currentCol + slot.colSpan;
             
             // If current slot ends before the row end, and next slot fits on the same row
             if (currentEnd <= 4 && (currentEnd + nextSlot.colSpan <= 5)) {
                 map[slot.id] = nextSlot.id;
             }
         }
         currentCol += slot.colSpan;
    });
    return map;
  }, [activeCover?.slots]);

  useEffect(() => {
    if (!activeCoverId && covers.length > 0) {
      onSetActiveCover(covers[0].id);
    }
  }, [covers.length]);

  // Reset layout mode when switching covers
  useEffect(() => {
      setIsLayoutMode(false);
      setDraggingSlotId(null);
      setDropTargetId(null);
      setResizeError(null);
  }, [activeCoverId]);

  const handleCreate = () => {
    if (newCoverName.trim()) {
      onCreateCover(newCoverName, selectedLayout);
      setNewCoverName('');
      setIsCreating(false);
      setSelectedLayout(CoverLayoutType.CLASSIC);
    }
  };

  const handleAssignArticle = (slotId: string) => {
    if (!activeCover || !selectedArticleId || isLayoutMode) return;
    
    const updatedSlots = activeCover.slots.map(slot => 
      slot.id === slotId ? { ...slot, articleId: selectedArticleId } : slot
    );

    onUpdateCover({ ...activeCover, slots: updatedSlots });
    setSelectedArticleId(null);
  };

  const handleClearSlot = (slotId: string) => {
    if (!activeCover) return;
    const updatedSlots = activeCover.slots.map(slot => 
      slot.id === slotId ? { ...slot, articleId: null } : slot
    );
    onUpdateCover({ ...activeCover, slots: updatedSlots });
  };

  // Module System
  const addModule = (type: 'FULL' | 'SPLIT' | 'TRIPLET' | 'GRID' | 'BANNER' | 'HERO') => {
      if (!activeCover) return;
      
      const now = Date.now();
      let newSlots: CoverSlot[] = [];

      if (type === 'FULL') {
          newSlots = [{ id: `s-${now}`, name: 'Full Width', articleId: null, colSpan: 4, rowSpan: 2 }];
      } else if (type === 'SPLIT') {
          newSlots = [
              { id: `s-${now}-1`, name: 'Left', articleId: null, colSpan: 2, rowSpan: 2 },
              { id: `s-${now}-2`, name: 'Right', articleId: null, colSpan: 2, rowSpan: 2 }
          ];
      } else if (type === 'TRIPLET') {
          newSlots = [
              { id: `s-${now}-1`, name: 'Main', articleId: null, colSpan: 2, rowSpan: 2 },
              { id: `s-${now}-2`, name: 'Sub 1', articleId: null, colSpan: 2, rowSpan: 1 },
              { id: `s-${now}-3`, name: 'Sub 2', articleId: null, colSpan: 2, rowSpan: 1 }
          ];
      } else if (type === 'GRID') {
          newSlots = [
              { id: `s-${now}-1`, name: 'Col 1', articleId: null, colSpan: 1, rowSpan: 1 },
              { id: `s-${now}-2`, name: 'Col 2', articleId: null, colSpan: 1, rowSpan: 1 },
              { id: `s-${now}-3`, name: 'Col 3', articleId: null, colSpan: 1, rowSpan: 1 },
              { id: `s-${now}-4`, name: 'Col 4', articleId: null, colSpan: 1, rowSpan: 1 }
          ];
      } else if (type === 'BANNER') {
          newSlots = [{ id: `s-${now}`, name: 'Banner', articleId: null, colSpan: 4, rowSpan: 1 }];
      } else if (type === 'HERO') {
          newSlots = [{ id: `s-${now}`, name: 'Hero', articleId: null, colSpan: 4, rowSpan: 2 }];
      }

      onUpdateCover({ ...activeCover, slots: [...activeCover.slots, ...newSlots] });
  };
  
  const addCustomSlot = (cols: number, rows: number) => {
      if (!activeCover) return;
      const now = Date.now();
      const newSlot: CoverSlot = {
          id: `s-${now}`,
          name: `Custom ${cols}x${rows}`,
          articleId: null,
          colSpan: cols,
          rowSpan: rows
      };
      onUpdateCover({ ...activeCover, slots: [...activeCover.slots, newSlot] });
  };

  const handleRemoveSlot = (slotId: string) => {
      if (!activeCover) return;
      const updatedSlots = activeCover.slots.filter(s => s.id !== slotId);
      onUpdateCover({ ...activeCover, slots: updatedSlots });
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, slot: CoverSlot) => {
      setDraggingSlotId(slot.id);
      e.dataTransfer.effectAllowed = "move";
      
      // Custom Ghost Image
      if (dragGhostRef.current) {
          const label = dragGhostRef.current.querySelector('#ghost-label');
          const sub = dragGhostRef.current.querySelector('#ghost-sub');
          if (label) label.textContent = slot.name || 'Module';
          if (sub) sub.textContent = `${slot.colSpan}x${slot.rowSpan}`;
          
          e.dataTransfer.setDragImage(dragGhostRef.current, 0, 0);
      }
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
      e.preventDefault(); // Necessary to allow dropping
      if (draggingSlotId === slotId) return;
      setDropTargetId(slotId);
      e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
      setDraggingSlotId(null);
      setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSlotId: string) => {
      e.preventDefault();
      
      if (!activeCover || !draggingSlotId || draggingSlotId === targetSlotId) {
          handleDragEnd();
          return;
      }

      const slots = [...activeCover.slots];
      const sourceIndex = slots.findIndex(s => s.id === draggingSlotId);
      const targetIndex = slots.findIndex(s => s.id === targetSlotId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
          // Move the slot in the array
          const [movedSlot] = slots.splice(sourceIndex, 1);
          slots.splice(targetIndex, 0, movedSlot);
          
          onUpdateCover({ ...activeCover, slots });
      }
      
      handleDragEnd();
  };

  // Column Divider Resize Logic (Simultaneous resize of adjacent columns)
  const handleColumnResizeStart = (e: React.MouseEvent, leftSlotId: string, rightSlotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const leftSlot = activeCover?.slots.find(s => s.id === leftSlotId);
    const rightSlot = activeCover?.slots.find(s => s.id === rightSlotId);

    if (!leftSlot || !rightSlot || !activeCover) return;

    setResizingColumnSlotId(leftSlotId);
    
    const startX = e.clientX;
    const leftStartSpan = leftSlot.colSpan;
    const rightStartSpan = rightSlot.colSpan;
    
    // Estimate column width based on the left element's current rendered width
    const slotElement = (e.target as HTMLElement).closest('.group'); 
    const slotWidth = slotElement ? slotElement.getBoundingClientRect().width : 200;
    const pixelsPerUnit = slotWidth / leftStartSpan;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const gridDelta = Math.round(deltaX / pixelsPerUnit);

        if (gridDelta === 0) return;

        // Calculate potential new spans
        // Max delta to right is (rightSpan - 1) -> shrinking right to 1
        // Max delta to left is -(leftSpan - 1) -> shrinking left to 1
        const clampedDelta = Math.max(-(leftStartSpan - 1), Math.min(gridDelta, rightStartSpan - 1));
        
        const finalLeft = leftStartSpan + clampedDelta;
        const finalRight = rightStartSpan - clampedDelta;

        if (finalLeft === leftSlot.colSpan && finalRight === rightSlot.colSpan) return;

        const updatedSlots = activeCover.slots.map(s => {
            if (s.id === leftSlotId) return { ...s, colSpan: finalLeft };
            if (s.id === rightSlotId) return { ...s, colSpan: finalRight };
            return s;
        });

        onUpdateCover({ ...activeCover, slots: updatedSlots });
    };
    
    const handleMouseUp = () => {
        setResizingColumnSlotId(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Standard Resize Logic (Corner resize)
  const handleResizeStart = (e: React.MouseEvent, slot: CoverSlot) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingSlot(slot.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const startCol = slot.colSpan;
      const startRow = slot.rowSpan;

      // Capture the initial grid state to compare against
      const initialAnalysis = analyzeGrid(activeCover?.slots || []);
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!activeCover) return;

          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          const colChange = Math.round(deltaX / 200);
          const rowChange = Math.round(deltaY / 100);

          let newCol = Math.max(1, Math.min(4, startCol + colChange));
          let newRow = Math.max(1, startRow + rowChange);

          const tempSlots = activeCover.slots.map(s => 
              s.id === slot.id ? { ...s, colSpan: newCol, rowSpan: newRow } : s
          );

          // Check for grid integrity
          const newAnalysis = analyzeGrid(tempSlots);
          
          // If the new layout creates *more* gaps than we started with, it means we are pushing
          // elements to wrap in an undesirable way. We prevent this specific expansion.
          if (newAnalysis.totalGaps > initialAnalysis.totalGaps) {
              setResizeError("Operation blocked: Causes invalid line break");
              return;
          }

          setResizeError(null);
          onUpdateCover({
              ...activeCover,
              slots: tempSlots
          });
      };

      const handleMouseUp = () => {
          setResizingSlot(null);
          setResizeError(null);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };


  const handleAiFill = async () => {
    if (!activeCover) return;
    setIsAiLoading(true);
    try {
      const suggestedIds = await suggestCoverLayout(articles);
      if (suggestedIds.length > 0) {
        const updatedSlots = activeCover.slots.map((slot, index) => ({
          ...slot,
          articleId: suggestedIds[index] || slot.articleId
        }));
        onUpdateCover({ ...activeCover, slots: updatedSlots });
      }
    } catch (e) {
      console.error("AI Fill failed", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderArticleContent = (article: Article, slot: CoverSlot, isPreview: boolean = false) => {
    const isMain = slot.colSpan >= 4 && slot.rowSpan >= 2; 
    const isVerticalFeature = slot.rowSpan >= 2 && slot.colSpan < 4; 
    const isHorizontalFeature = slot.colSpan >= 3 && slot.rowSpan === 1; 

    // --- SPECIAL STYLES BASED ON ARTICLE TYPE ---
    
    if (article.type === ArticleType.BREAKING) {
        return (
            <div className="h-full w-full bg-red-700 text-white p-6 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Breaking News</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-black font-serif leading-tight mb-2">{article.title}</h3>
                <p className="text-red-100 text-sm line-clamp-2 font-medium">{article.subtitle}</p>
                <div className="absolute bottom-0 right-0 p-3 opacity-10 transform translate-y-1/2 translate-x-1/4">
                    <Newspaper size={100} />
                </div>
            </div>
        );
    }

    if (article.type === ArticleType.OPINION) {
        return (
            <div className="h-full w-full bg-[#FFFBF0] p-6 flex flex-col items-center text-center justify-center border-y-4 border-double border-slate-200 group hover:border-slate-300 transition-colors">
                <div className="mb-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 mx-auto mb-2 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                        <img src={`https://ui-avatars.com/api/?name=${article.author}&background=random`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Opinion</span>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold font-serif text-slate-900 mb-2 italic leading-tight">
                    <span className="text-slate-400 mr-1">"</span>{article.title}<span className="text-slate-400 ml-1">"</span>
                </h3>
                <div className="w-8 h-px bg-slate-300 my-3"></div>
                <p className="text-xs font-bold uppercase text-slate-900 tracking-wide">By {article.author}</p>
            </div>
        );
    }

    if (article.type === ArticleType.FEATURE) {
        return (
            <div className="h-full w-full relative group overflow-hidden bg-slate-900">
                 <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-6 lg:p-8">
                    <span className="inline-block px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest mb-3">
                        Feature
                    </span>
                    <h3 className="text-2xl lg:text-4xl font-black font-serif text-white leading-tight mb-3 text-shadow-sm">
                        {article.title}
                    </h3>
                    <p className="text-white/90 text-sm lg:text-base font-medium line-clamp-2 max-w-2xl">
                        {article.subtitle}
                    </p>
                </div>
            </div>
        );
    }

    // --- STANDARD LAYOUT (Default fallback) ---
    
    const containerClasses = isHorizontalFeature ? 'flex-row' : 'flex-col';
    
    return (
        <div className={`h-full w-full flex bg-white group overflow-hidden border border-transparent ${!isPreview && !isMain ? 'hover:border-slate-200' : ''} ${containerClasses}`}>
            
            {/* Image Rendering */}
            {article.imageUrl && (
                <div className={`relative overflow-hidden bg-slate-100 
                    ${isHorizontalFeature ? 'w-1/3 order-2 border-l border-slate-100' : ''}
                    ${isMain ? 'h-[65%] w-full order-1' : ''}
                    ${!isHorizontalFeature && !isMain ? 'aspect-[16/9] w-full order-1' : ''}
                `}>
                    <img 
                        src={article.imageUrl} 
                        alt={article.title} 
                        className={`w-full h-full object-cover transition-transform duration-700 ease-out ${!isPreview && 'group-hover:scale-105'}`}
                    />
                </div>
            )}
            
            {/* Text Content Rendering */}
            <div className={`flex flex-col 
                ${isHorizontalFeature ? 'w-2/3 order-1 p-5 lg:p-6 justify-center' : ''}
                ${!isHorizontalFeature ? 'flex-1 p-5 lg:p-6' : ''}
                ${isMain ? 'px-8 lg:px-10 py-6' : ''}
            `}>
                
                {/* Header: Category & AI Badge */}
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-800 font-sans">
                        {article.category}
                    </span>
                    {article.aiGenerated && (
                        <span className="text-[9px] font-bold text-slate-400 border border-slate-200 px-1.5 rounded bg-slate-50">AI</span>
                    )}
                </div>
                
                {/* Headline */}
                <h3 className={`font-serif text-slate-900 leading-[1.1] tracking-tight decoration-2 decoration-slate-200 underline-offset-4 mb-3 ${!isPreview && 'group-hover:underline'}
                    ${isMain ? 'text-4xl lg:text-5xl font-black mb-4' : ''}
                    ${isVerticalFeature ? 'text-2xl lg:text-3xl font-bold' : ''}
                    ${isHorizontalFeature ? 'text-2xl font-bold' : ''}
                    ${!isMain && !isVerticalFeature && !isHorizontalFeature ? 'text-lg lg:text-xl font-bold' : ''}
                `}>
                    {article.title}
                </h3>

                {/* Excerpt (Conditional Display) */}
                {(isMain || isVerticalFeature) && (
                    <p className={`font-serif text-slate-600 leading-relaxed mb-4
                        ${isMain ? 'text-lg line-clamp-3' : 'text-sm line-clamp-4'}
                    `}>
                        {article.content}
                    </p>
                )}
                
                {/* Spacer to push footer to bottom */}
                <div className="flex-1"></div>

                {/* Footer: Author & Date */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                        By {article.author}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {article.publishedAt}
                    </span>
                </div>
            </div>
        </div>
    );
  };

  const renderSlot = (slot: CoverSlot, index: number) => {
    const assignedArticle = articles.find(a => a.id === slot.articleId);
    const isResizing = resizingSlot === slot.id;
    const rightNeighborId = slotLayoutMap[slot.id];

    // Layout Mode Render
    if (isLayoutMode) {
        const isDragging = draggingSlotId === slot.id;
        const isDropTarget = dropTargetId === slot.id;
        const isColumnResizing = resizingColumnSlotId === slot.id;

        return (
            <div
                key={slot.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, slot)}
                onDragOver={(e) => handleDragOver(e, slot.id)}
                onDrop={(e) => handleDrop(e, slot.id)}
                onDragEnd={handleDragEnd}
                className={`relative border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 select-none cursor-move group overflow-hidden
                    ${isDragging 
                        ? 'opacity-30 border-slate-300 border-dashed scale-95 bg-slate-50 grayscale' 
                        : isDropTarget
                            ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/20 scale-[1.02] z-30 shadow-xl'
                            : isResizing || isColumnResizing
                                ? 'border-blue-600 bg-blue-50 z-20 shadow-xl'
                                : 'border-dashed border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-white hover:shadow-md hover:ring-2 hover:ring-blue-200/50 hover:-translate-y-0.5'
                    }
                `}
                style={{ 
                    gridColumn: `span ${slot.colSpan}`, 
                    gridRow: `span ${slot.rowSpan}`,
                    minHeight: slot.rowSpan * 160
                }}
            >
                <div className={`absolute top-2 left-2 text-slate-300 transition-colors ${isDropTarget ? 'text-blue-400' : ''}`}>
                    <GripVertical size={20} />
                </div>
                <div className={`text-slate-400 font-mono text-xs uppercase tracking-wider mb-2 pointer-events-none transition-colors ${isDropTarget ? 'text-blue-600 font-bold' : ''}`}>
                    {slot.colSpan}x{slot.rowSpan}
                </div>
                
                {/* Drop Indicator Overlay */}
                {isDropTarget && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/40 backdrop-blur-[1px] animate-in fade-in duration-150 rounded-lg border-2 border-blue-500 border-dashed">
                         <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold text-sm transform scale-110 animate-bounce-short">
                             <ArrowLeftRight size={16} />
                             <span>Swap</span>
                         </div>
                    </div>
                )}

                <div className="flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
                    <button onClick={() => handleRemoveSlot(slot.id)} className="p-1.5 bg-red-50 text-red-600 rounded shadow-sm hover:bg-red-100 transition-all">
                        <Trash2 size={16}/>
                    </button>
                </div>
                
                {/* Standard Corner Resize Handle */}
                <div 
                    className="absolute bottom-2 right-2 cursor-se-resize p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors z-20"
                    onMouseDown={(e) => handleResizeStart(e, slot)}
                >
                    <Scaling size={20} />
                </div>

                {/* Column Divider Resize Handle (New) */}
                {rightNeighborId && (
                    <div 
                        className="absolute -right-3 md:-right-4 top-0 bottom-0 w-6 md:w-8 flex items-center justify-center cursor-col-resize group/divider z-30"
                        onMouseDown={(e) => handleColumnResizeStart(e, slot.id, rightNeighborId)}
                    >
                         <div className={`w-1 h-8 rounded-full transition-all shadow-sm group-hover/divider:scale-y-150 group-hover/divider:h-12
                            ${resizingColumnSlotId === slot.id ? 'bg-blue-600 scale-y-150 h-12' : 'bg-slate-300 group-hover/divider:bg-blue-500'}
                         `}></div>
                    </div>
                )}
            </div>
        );
    }

    // Final Newspaper Render
    return (
      <div 
        key={slot.id}
        className={`relative transition-all duration-300 h-full flex flex-col
          ${assignedArticle 
            ? 'bg-white' 
            : 'bg-slate-50 border border-dashed border-slate-300 hover:border-blue-300 hover:bg-blue-50/30'
          }
          ${selectedArticleId && !assignedArticle ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50/30 cursor-pointer animate-pulse-slow' : ''}
        `}
        style={{ 
          gridColumn: `span ${slot.colSpan}`, 
          gridRow: `span ${slot.rowSpan}`,
          minHeight: slot.rowSpan > 1 ? '350px' : '220px',
        }}
        onClick={() => !assignedArticle && selectedArticleId && handleAssignArticle(slot.id)}
      >
        {assignedArticle ? (
          <div className="h-full w-full relative group"> 
            {renderArticleContent(assignedArticle, slot)}
            
            {/* Hover Actions (Editor Only) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                onClick={(e) => { e.stopPropagation(); handleClearSlot(slot.id); }}
                className="p-2 bg-white text-red-600 rounded-none shadow-sm border border-slate-200 hover:bg-red-50"
                title="Remove Article"
                >
                <Trash2 size={14} />
                </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center select-none">
            {selectedArticleId ? (
                 <>
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 animate-bounce">
                        <Plus size={20} />
                    </div>
                    <span className="text-sm font-semibold text-blue-700">Place Article</span>
                 </>
            ) : (
                <>
                    <Layout size={24} className="mb-2 opacity-20" />
                    <span className="text-xs font-medium uppercase tracking-wide opacity-40">
                    Empty Slot
                    </span>
                </>
            )}
          </div>
        )}
      </div>
    );
  };

  const NewspaperHeader = () => (
    <header className="mb-12 select-none">
        {/* Top Metadata Strip */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1 mb-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-sans">Global Edition</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-sans">Vol. 24 • No. 102</div>
        </div>
        <div className="border-b border-slate-300 mb-8"></div>

        {/* Masthead Title */}
        <div className="flex flex-col items-center justify-center mb-8">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black font-serif tracking-tighter text-slate-900 leading-none mb-4 text-center scale-y-90">
                DIARIO<span className="text-red-700">.</span>
            </h1>
            
            {/* Date & Price Line */}
            <div className="w-full border-y-2 border-slate-900 py-2 flex justify-between items-center px-4">
                <span className="text-xs font-serif font-bold text-slate-900 uppercase tracking-wider">
                    {activeCover ? new Date(activeCover.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                </span>
                <span className="text-xs font-sans font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                    {activeCover?.name}
                </span>
                <span className="text-xs font-serif font-bold text-slate-900 uppercase tracking-wider">
                    $2.50 USD
                </span>
            </div>
        </div>
    </header>
  );

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden bg-slate-100">
      
      {/* Sidebar: Editions & Assets */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        
        {/* Top: Editions List or Creator */}
        <div className="flex-shrink-0 flex flex-col max-h-[50%] border-b border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 font-serif">
                    <Newspaper size={18} />
                    Editions
                </h2>
                {!isCreating && (
                    <Button size="sm" variant="ghost" onClick={() => setIsCreating(true)} className="text-blue-600 hover:bg-blue-50 h-8">
                        <Plus size={16} className="mr-1" /> New
                    </Button>
                )}
            </div>

            {isCreating ? (
                <div className="p-5 bg-slate-50 animate-in slide-in-from-left-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900">New Edition</h3>
                        <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Name</label>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="e.g. Weekend Special"
                                className="w-full text-sm p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                value={newCoverName}
                                onChange={e => setNewCoverName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                    
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wider">Layout</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[CoverLayoutType.CLASSIC, CoverLayoutType.MODERN, CoverLayoutType.GRID, CoverLayoutType.BANNER, CoverLayoutType.HERO, CoverLayoutType.CUSTOM].map(type => (
                                    <div 
                                        key={type} 
                                        onClick={() => setSelectedLayout(type)}
                                        className="cursor-pointer group"
                                    >
                                        <LayoutThumbnail type={type} selected={selectedLayout === type} />
                                        <span className={`text-[10px] font-medium mt-2 block text-center transition-colors ${selectedLayout === type ? 'text-slate-900 font-bold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                            {getLayoutLabel(type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button className="w-full mt-2" onClick={handleCreate} disabled={!newCoverName}>
                            Create Edition
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar bg-slate-50/30">
                    {covers.length === 0 && (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                            <Layout size={24} className="mb-2 opacity-30"/>
                            <p className="text-sm">No editions yet.</p>
                        </div>
                    )}
                    {covers.map(cover => (
                        <div 
                            key={cover.id}
                            onClick={() => onSetActiveCover(cover.id)}
                            className={`group p-3 rounded-lg cursor-pointer transition-all border flex items-center justify-between ${
                            activeCoverId === cover.id 
                                ? 'bg-white border-slate-200 shadow-md z-10' 
                                : 'bg-transparent border-transparent hover:bg-white hover:shadow-sm hover:border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                                    activeCoverId === cover.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                }`}>
                                    {getLayoutIcon(cover.layout)}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-serif font-bold leading-none mb-1 ${activeCoverId === cover.id ? 'text-slate-900' : 'text-slate-600'}`}>
                                        {cover.name}
                                    </h4>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Calendar size={10} /> {cover.date}
                                    </span>
                                </div>
                            </div>
                            {activeCoverId === cover.id && <ChevronRight size={16} className="text-slate-400" />}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Bottom: Article Picker */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
            {isLayoutMode ? (
                <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
                    <div className="p-6 text-center">
                        <Settings2 size={40} className="mb-4 text-blue-200 mx-auto" />
                        <h3 className="font-bold text-slate-800 mb-2">Layout Modules</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6 max-w-[200px] mx-auto">
                            Quickly append pre-defined layouts or use the interactive builder in the workspace.
                        </p>
                        
                        <div className="space-y-3 px-4">
                             <button onClick={() => addModule('HERO')} className="w-full p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group">
                                <div className="w-12 h-8 border border-slate-300 rounded bg-slate-100 group-hover:bg-blue-50"></div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Hero (4x2)</span>
                             </button>
                             <button onClick={() => addModule('FULL')} className="w-full p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group">
                                <div className="w-12 h-6 border border-slate-300 rounded bg-slate-100 group-hover:bg-blue-50 flex flex-col justify-center items-center">
                                    <div className="w-8 h-0.5 bg-slate-300"></div>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Full Width</span>
                             </button>
                             <button onClick={() => addModule('SPLIT')} className="w-full p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group">
                                <div className="w-12 h-8 border border-slate-300 rounded bg-slate-100 flex gap-0.5 group-hover:bg-blue-50">
                                    <div className="w-1/2 border-r border-slate-300"></div>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Split (2x2)</span>
                             </button>
                             <button onClick={() => addModule('TRIPLET')} className="w-full p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group">
                                <div className="w-12 h-8 border border-slate-300 rounded bg-slate-100 grid grid-cols-2 gap-px group-hover:bg-blue-50">
                                    <div className="row-span-2 border-r border-slate-300"></div>
                                    <div className="border-b border-slate-300"></div>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Triplet</span>
                             </button>
                             <button onClick={() => addModule('GRID')} className="w-full p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group">
                                <div className="w-12 h-6 border border-slate-300 rounded bg-slate-100 grid grid-cols-4 gap-px group-hover:bg-blue-50">
                                    <div></div><div></div><div></div><div></div>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Grid Row</span>
                             </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <FileText size={16} />
                        Available Articles
                    </h3>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{articles.filter(a => !activeCover?.slots.some(s => s.articleId === a.id)).length}</span>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1 bg-slate-50/30">
                    {articles
                        .filter(article => !activeCover?.slots.some(slot => slot.articleId === article.id)) // Hide already assigned
                        .map(article => (
                        <div 
                            key={article.id}
                            onClick={() => setSelectedArticleId(selectedArticleId === article.id ? null : article.id)}
                            className={`p-3 bg-white border rounded-lg cursor-pointer transition-all hover:shadow-md flex gap-3 ${
                                selectedArticleId === article.id 
                                ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                                : 'border-slate-200 hover:border-blue-300'
                            }`}
                        >
                            <div className="w-16 h-16 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                                <img src={article.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider mb-1 block">{article.category}</span>
                                <h4 className="text-xs font-bold font-serif text-slate-900 leading-snug mb-1 line-clamp-2">{article.title}</h4>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400">{article.author}</span>
                                    {article.type !== ArticleType.STANDARD && (
                                        <span className="text-[9px] font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">{article.type}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {articles.length === 0 && (
                        <div className="text-center p-8 text-slate-400">
                            <p>No articles found.</p>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => setIsLayoutMode(false)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${!isLayoutMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Type size={14} /> Editor
                    </button>
                    <button 
                        onClick={() => setIsLayoutMode(true)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${isLayoutMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Layout size={14} /> Layout
                    </button>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <button 
                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                    className={`text-xs font-bold flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${isPreviewOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    {isPreviewOpen ? <Eye size={14} /> : <MonitorPlay size={14} />}
                    Preview
                </button>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="secondary" 
                    size="sm" 
                    icon={<Wand2 size={14} className={isAiLoading ? "animate-spin" : ""} />}
                    onClick={handleAiFill}
                    disabled={isAiLoading || !activeCover || isLayoutMode}
                    className="hidden md:flex"
                >
                    {isAiLoading ? 'Thinking...' : 'AI Auto-Fill'}
                </Button>
                <Button size="sm" icon={<Save size={14} />}>Save</Button>
            </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100/50 relative p-4 md:p-8 lg:p-12 flex justify-center">
            {activeCover ? (
                <div 
                    className={`bg-white shadow-xl transition-all duration-500 ease-in-out
                        ${isPreviewOpen ? 'w-full max-w-[1400px] scale-[1.02]' : 'w-full max-w-[1000px]'}
                        min-h-[1200px] flex flex-col relative
                    `}
                >
                    {/* Layout Error Toast */}
                    {resizeError && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in">
                             <Ban size={18} className="text-red-400" />
                             <span className="text-sm font-bold">{resizeError}</span>
                        </div>
                    )}

                    <div className="p-8 md:p-12 lg:p-16 flex-1 flex flex-col">
                        <NewspaperHeader />
                        
                        {/* Grid Container */}
                        <div className="grid grid-cols-4 gap-4 md:gap-6 lg:gap-8 auto-rows-min flex-1">
                            {/* Layout Warning Banner */}
                            {isLayoutMode && (!gridAnalysis.isComplete || gridAnalysis.totalGaps > 0) && (
                                <div className="col-span-4 mb-2 bg-amber-50 text-amber-800 p-3 rounded-lg flex items-center gap-2 text-sm border border-amber-200 animate-in fade-in slide-in-from-top-2">
                                    <AlertTriangle size={16} className="text-amber-600" />
                                    <div className="flex flex-col">
                                        <span className="font-bold">Grid Integrity Warning</span>
                                        <span className="text-xs opacity-90">
                                            {gridAnalysis.totalGaps > 0 ? `Detected ${gridAnalysis.totalGaps} empty slots in previous rows.` : ''}
                                            {!gridAnalysis.isComplete ? ` Current row is incomplete (${gridAnalysis.remainingInRow} slots remaining).` : ''}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {activeCover.slots.map((slot, index) => renderSlot(slot, index))}
                            
                            {/* Grid Builder in Layout Mode */}
                            {isLayoutMode && (
                                <GridSlotBuilder 
                                    onAdd={addCustomSlot} 
                                    remainingSpace={gridAnalysis.remainingInRow}
                                />
                            )}
                        </div>
                    </div>
                    
                    {/* Footer Branding */}
                    <div className="border-t-4 border-slate-900 p-6 flex justify-between items-center bg-slate-50">
                        <span className="font-serif font-bold text-slate-900 uppercase tracking-widest text-xs">DiarioCMS</span>
                        <span className="font-sans font-bold text-slate-400 uppercase tracking-widest text-[10px]">Page 1</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                    <Layout size={48} className="mb-4 opacity-20" />
                    <p>Select or create an edition to start editing.</p>
                </div>
            )}
        </div>
      </div>
      
      {/* Drag Ghost Element (Hidden from view, used for drag image) */}
      <div 
        ref={dragGhostRef} 
        className="fixed -top-[1000px] left-0 w-64 bg-white p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 flex items-center gap-4 z-[1000] pointer-events-none"
      >
        <div className="w-12 h-12 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Layout size={24} />
        </div>
        <div className="min-w-0">
            <div id="ghost-label" className="font-bold text-slate-900 text-sm truncate">Module Name</div>
            <div id="ghost-sub" className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">SIZE</div>
        </div>
        <div className="ml-auto text-blue-500">
            <MoveHorizontal size={20} />
        </div>
      </div>
    </div>
  );
};
