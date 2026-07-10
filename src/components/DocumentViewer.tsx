/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ReadingDocument, Highlight, HighlightColor, Annotation, Prediction } from '../types';
import { parseMarkdown } from '../utils/markdownParser';
import { ImageStore } from '../utils/syncManager';
import { 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  AlertTriangle, 
  Trash2, 
  Edit2, 
  MoreVertical, 
  Check, 
  Plus, 
  MessageSquare, 
  Download, 
  X, 
  PenTool, 
  CheckCircle2, 
  Printer, 
  Tag, 
  Compass, 
  Lightbulb, 
  Award,
  ChevronRight,
  ChevronLeft,
  Info,
  ArrowLeft,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface DocumentViewerProps {
  document: ReadingDocument;
  highlights: Highlight[];
  annotations: Annotation[];
  predictions: Prediction[];
  onAddHighlight: (text: string, color: HighlightColor, category: string, coords?: { x: number; y: number; w: number; h: number; pageIndex?: number }) => string; // returns highlightId
  onDeleteHighlight: (id: string) => void;
  onSelectHighlight: (highlight: Highlight | null) => void;
  selectedHighlight: Highlight | null;
  onAddAnnotation: (highlightId: string, comment: string, coords?: { x: number; y: number; pageIndex?: number }) => void;
  onAddPrediction: (text: string, coords?: { x: number; y: number; pageIndex?: number }) => void;
  onUpdatePredictionStatus: (id: string, status: 'pending' | 'correct' | 'incorrect') => void;
  onDeletePrediction: (id: string) => void;
  onAskAI: (text: string, type: 'explain' | 'predict' | 'question') => void;
  aiLoading: boolean;
  aiResult: string | null;
  onClearAIResult: () => void;
  onGenerateAIReport: () => void;
  studentName: string;
  onBackToLanding?: () => void;
  onUpdateDocumentContent?: (id: string, newContent: string) => void;
  onAddCompiledDocument?: (title: string, imageUrl: string) => void;
  onUpdateAnnotationCoords?: (id: string, x: number, y: number) => void;
  onUpdateHighlightColor?: (id: string, color: HighlightColor) => void;
}

interface AnnotationPinMarkerProps {
  ann: Annotation;
  idx: number;
  highlights: Highlight[];
  selectedHighlight: Highlight | null;
  onSelectHighlight: (hl: Highlight) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateCoords?: (id: string, x: number, y: number) => void;
}

const AnnotationPinMarker: React.FC<AnnotationPinMarkerProps> = ({
  ann,
  idx,
  highlights,
  selectedHighlight,
  onSelectHighlight,
  onDeleteHighlight
}) => {
  const [isHoveredOver1s, setIsHoveredOver1s] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSelected = selectedHighlight?.id === ann.highlightId;

  const handleMouseEnter = () => {
    if (isHoveredOver1s || isSelected) return;
    
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      setIsHoveredOver1s(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHoveredOver1s(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`absolute group transition-all duration-300 ${isSelected ? 'z-40 scale-105' : 'z-20'}`}
      style={{
        left: `${ann.x}%`,
        top: `${ann.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={(e) => {
        e.stopPropagation();
        const hl = highlights.find(h => h.id === ann.highlightId);
        if (hl) onSelectHighlight(hl);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 
        The orange dot/pin:
        - Small orange dot: w-1.5 h-1.5 bg-orange-500 rounded-full shadow-xs
        - If hovered >1s (isHoveredOver1s): w-7 h-7, bg-orange-600, ring-2 ring-orange-400
      */}
      <div 
        className={`rounded-full text-white flex items-center justify-center transition-all duration-500 relative cursor-pointer ${
          isHoveredOver1s
            ? 'w-7 h-7 bg-orange-600 ring-2 ring-orange-400 ring-offset-1 scale-110 shadow-lg'
            : 'w-1.5 h-1.5 bg-orange-500 scale-100 hover:scale-125 shadow-xs'
        }`}
        title="Nota al Margen"
      >
        {/* Comment icon only visible when hovered over 1s */}
        <div className={`transition-all duration-300 ${isHoveredOver1s ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
          {isHoveredOver1s && <MessageSquare size={11} strokeWidth={3} />}
        </div>

        {/* Pulsing ring only when selected */}
        {isSelected && (
          <div className="absolute inset-0 rounded-full border border-orange-400/60 animate-ping opacity-40 pointer-events-none" />
        )}
      </div>

      {/* Popover */}
      <div className={`absolute left-1/2 bottom-8 -translate-x-1/2 w-56 bg-slate-950/95 backdrop-blur-sm text-white text-[11px] p-3 rounded-2xl shadow-2xl transition-all duration-200 z-50 flex flex-col space-y-1.5 ${
        isSelected
          ? 'opacity-100 scale-100 pointer-events-auto' 
          : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-1">
          <span className="font-extrabold text-[9px] tracking-wider text-orange-400 uppercase flex items-center gap-1">💬 Nota {idx + 1}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const hl = highlights.find(h => h.id === ann.highlightId);
              if (hl) onDeleteHighlight(hl.id);
            }}
            className="text-white/60 hover:text-red-400 font-bold text-[9px] cursor-pointer"
          >
            Eliminar
          </button>
        </div>
        <p className="leading-normal text-white/95 font-medium break-words text-left">{ann.comment}</p>
      </div>
    </div>
  );
};

interface VisualHighlightMarkerProps {
  hl: Highlight;
  selectedHighlight: Highlight | null;
  onSelectHighlight: (hl: Highlight | null) => void;
  onDeleteHighlight: (id: string) => void;
  editingHighlightColorId: string | null;
  setEditingHighlightColorId: (id: string | null) => void;
  colorClasses: Record<HighlightColor, { bg: string; border: string; hover: string; text: string; hex: string; lightHex: string }>;
  colorLabels: Record<HighlightColor, string>;
  onUpdateHighlightColor?: (id: string, color: HighlightColor) => void;
}

const VisualHighlightMarker: React.FC<VisualHighlightMarkerProps> = ({
  hl,
  selectedHighlight,
  onSelectHighlight,
  onDeleteHighlight,
  editingHighlightColorId,
  setEditingHighlightColorId,
  colorClasses,
  colorLabels,
  onUpdateHighlightColor
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHovered) {
      setShowTooltip(true);
      timer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
    } else {
      setShowTooltip(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isHovered]);

  const labelText = colorLabels[hl.color]?.trim() || '';

  return (
    <div
      data-visual-highlight-id={hl.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelectHighlight(hl);
        setEditingHighlightColorId(editingHighlightColorId === hl.id ? null : hl.id);
      }}
      onMouseDown={(e) => {
        // Prevent parent box drawing while clicking on highlight
        e.stopPropagation();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute border transition-all hover:ring-2 hover:ring-indigo-500/50 group cursor-pointer ${
        selectedHighlight?.id === hl.id 
          ? 'ring-4 ring-indigo-600 ring-offset-2 z-40 scale-[1.03] shadow-2xl animate-pulse border-indigo-600' 
          : (colorClasses[hl.color]?.border || 'border-yellow-400')
      } ${colorClasses[hl.color]?.bg || 'bg-yellow-250/50'}`}
      style={{
        left: `${hl.x}%`,
        top: `${hl.y}%`,
        width: `${hl.w}%`,
        height: `${hl.h}%`,
      }}
    >
      {/* Hover delete */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDeleteHighlight(hl.id); }}
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer transition-transform scale-0 group-hover:scale-100 z-50"
      >
        ✕
      </button>

      {/* Color selector popup */}
      {editingHighlightColorId === hl.id && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/95 backdrop-blur-xs text-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 z-50 border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(['yellow', 'green', 'blue', 'orange', 'red'] as HighlightColor[]).map((c) => {
            const isActive = !!colorLabels[c]?.trim();
            return (
              <button
                key={c}
                type="button"
                disabled={!isActive}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdateHighlightColor) {
                    onUpdateHighlightColor(hl.id, c);
                  }
                  setEditingHighlightColorId(null);
                }}
                className={`w-6 h-6 rounded-full transition-all duration-200 border-2 ${
                  isActive 
                    ? 'cursor-pointer hover:scale-125' 
                    : 'opacity-20 cursor-not-allowed hover:scale-100'
                } ${
                  hl.color === c ? 'border-white scale-110 shadow-lg ring-2 ring-indigo-500' : 'border-transparent hover:border-white/40'
                } ${
                  c === 'yellow' ? 'bg-yellow-400' :
                  c === 'green' ? 'bg-green-500' :
                  c === 'blue' ? 'bg-blue-500' :
                  c === 'orange' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                title={
                  isActive 
                    ? `Cambiar color a ${colorLabels[c] || c}` 
                    : `Color ${c} inactivo (sin etiqueta escrita)`
                }
              />
            );
          })}
        </div>
      )}

      {/* 3 Seconds Color Label Tooltip */}
      {showTooltip && labelText && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xl z-50 border border-slate-700 max-w-[150px] truncate animate-in fade-in slide-in-from-bottom-1 duration-200 pointer-events-none select-none text-center"
        >
          {labelText}
        </div>
      )}

      {hl.color === 'orange' && (
        <div 
          className="absolute top-0.5 left-0.5 bg-orange-500 text-white rounded-md p-0.5 flex items-center justify-center shadow-xs border border-orange-400 select-none scale-75 origin-top-left pointer-events-none"
          title="Nota al Margen vinculada"
        >
          <MessageSquare size={10} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

export default function DocumentViewer({
  document,
  highlights,
  annotations,
  predictions,
  onAddHighlight,
  onDeleteHighlight,
  onSelectHighlight,
  selectedHighlight,
  onAddAnnotation,
  onAddPrediction,
  onUpdatePredictionStatus,
  onDeletePrediction,
  onAskAI,
  aiLoading,
  aiResult,
  onClearAIResult,
  onGenerateAIReport,
  studentName,
  onBackToLanding,
  onUpdateDocumentContent,
  onAddCompiledDocument,
  onUpdateAnnotationCoords,
  onUpdateHighlightColor
}: DocumentViewerProps) {
  // Manual correction / Extraction Fallback state
  const [manualText, setManualText] = useState(document.content);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isOptimizingWithAI, setIsOptimizingWithAI] = useState(false);

  useEffect(() => {
    setManualText(document.content);
  }, [document.id, document.content]);

  const handleOptimizeWithAI = async (textToOptimize: string) => {
    if (!textToOptimize || !textToOptimize.trim()) return;
    setIsOptimizingWithAI(true);
    try {
      const response = await fetch('/api/ai/optimize-document-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToOptimize, title: document.title })
      });
      const data = await response.json();
      if (data.success && data.optimizedText) {
        setManualText(data.optimizedText);
        if (onUpdateDocumentContent) {
          onUpdateDocumentContent(document.id, data.optimizedText);
        }
        alert("¡Éxito! El texto ha sido optimizado y estructurado por la Inteligencia Artificial para una lectura impecable.");
      } else {
        alert(data.error || "Ocurrió un error al procesar la optimización del texto.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error de conexión al optimizar el texto con la Inteligencia Artificial.");
    } finally {
      setIsOptimizingWithAI(false);
    }
  };

  const loadJsPDF = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).jspdf) {
        resolve((window as any).jspdf);
        return;
      }
      const script = window.document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        resolve((window as any).jspdf);
      };
      script.onerror = () => reject(new Error("No se pudo cargar la librería jsPDF"));
      window.document.head.appendChild(script);
    });
  };

  // Visual study mode dragging & compilation state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  // Multi-page visual navigation state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [resolvedPageUrls, setResolvedPageUrls] = useState<Record<number, string>>({});
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [allowedPages, setAllowedPages] = useState<number[] | null>(null);
  
  // PDF Text Layer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [loadingPdfPage, setLoadingPdfPage] = useState(false);
  const [pdfSelectionCoords, setPdfSelectionCoords] = useState<{ x: number; y: number; w: number; h: number; pageIndex: number } | null>(null);

  // Ask page range selection overlay when loading document
  const [showPageRangeModal, setShowPageRangeModal] = useState(false);
  const [rangeStartPage, setRangeStartPage] = useState<number>(1);
  const [rangeEndPage, setRangeEndPage] = useState<number>(1);

  // Load PDF.js helper
  const loadPdfJSInViewer = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = window.document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve((window as any).pdfjsLib);
      };
      script.onerror = () => reject(new Error("No se pudo cargar la librería PDF.js"));
      window.document.head.appendChild(script);
    });
  };

  useEffect(() => {
    // Reset pages state
    setCurrentPageIndex(0);
    setResolvedPageUrls({});
    
    if (document.pages && document.pages.length > 1) {
      // Open page range modal inside viewer
      setShowPageRangeModal(true);
      setRangeStartPage(1);
      setRangeEndPage(document.pages.length);
      setAllowedPages(null);
    } else {
      setShowPageRangeModal(false);
      setAllowedPages([0]);
    }
  }, [document.id]);

  useEffect(() => {
    // Cache current page image URL if not loaded raw
    if (!document.hasPdfRaw && document.pages && document.pages[currentPageIndex]) {
      const pageUrl = document.pages[currentPageIndex];
      if (pageUrl.startsWith('indexeddb:')) {
        const key = pageUrl.replace('indexeddb:', '');
        ImageStore.get(key).then(val => {
          if (val) {
            setResolvedPageUrls(prev => ({ ...prev, [currentPageIndex]: val }));
          }
        });
      } else {
        setResolvedPageUrls(prev => ({ ...prev, [currentPageIndex]: pageUrl }));
      }
    }
  }, [document.id, currentPageIndex, document.pages, document.hasPdfRaw]);

  useEffect(() => {
    let active = true;
    if (!document.hasPdfRaw || !allowedPages) return;

    const renderPdfPage = async () => {
      setLoadingPdfPage(true);
      try {
        const pdfData = await ImageStore.get(`pdf_raw_${document.id}`);
        if (!pdfData) {
          throw new Error("No raw PDF found in store");
        }

        const pdfjs = await loadPdfJSInViewer();
        const loadingTask = pdfjs.getDocument({ data: atob(pdfData) });
        const pdfDoc = await loadingTask.promise;

        if (!active) return;

        // Remember PDF.js pages are 1-based
        const page = await pdfDoc.getPage(currentPageIndex + 1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;

        if (canvas && active) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
          }
        }

        if (textLayerDiv && active) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.setProperty('--scale-factor', viewport.scale.toString());

          const textContent = await page.getTextContent();
          await pdfjs.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
          }).promise;

          // Scale textLayer initially to match container
          const parent = textLayerDiv.parentElement;
          if (parent) {
            const parentWidth = parent.getBoundingClientRect().width;
            const scale = parentWidth / viewport.width;
            textLayerDiv.style.transform = `scale(${scale})`;
            textLayerDiv.style.transformOrigin = 'top left';
          }
        }
      } catch (err) {
        console.error("Error rendering PDF page:", err);
      } finally {
        if (active) setLoadingPdfPage(false);
      }
    };

    renderPdfPage();

    return () => {
      active = false;
    };
  }, [document.id, currentPageIndex, allowedPages]);

  // Keep textLayer aligned and scaled with container on resize
  useEffect(() => {
    if (!document.hasPdfRaw) return;
    const handleResize = () => {
      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv && textLayerDiv.style.width) {
        const parent = textLayerDiv.parentElement;
        if (parent) {
          const parentWidth = parent.getBoundingClientRect().width;
          const textLayerWidth = parseFloat(textLayerDiv.style.width);
          if (textLayerWidth > 0) {
            const scale = parentWidth / textLayerWidth;
            textLayerDiv.style.transform = `scale(${scale})`;
            textLayerDiv.style.transformOrigin = 'top left';
          }
        }
      }
    };
    window.addEventListener('resize', handleResize);
    let resizeObserver: ResizeObserver | null = null;
    const parent = textLayerRef.current?.parentElement;
    if (parent && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(parent);
    }
    
    // Force immediate alignment
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [document.id, document.hasPdfRaw, currentPageIndex, zoomLevel]);

  useEffect(() => {
    if (document.imageUrl && document.imageUrl.startsWith('indexeddb:')) {
      const key = document.imageUrl.replace('indexeddb:', '');
      ImageStore.get(key).then(val => {
        setResolvedImageUrl(val);
      }).catch(err => {
        console.error("Error loading image from IndexedDB:", err);
        setResolvedImageUrl(null);
      });
    } else {
      setResolvedImageUrl(document.imageUrl || null);
    }
  }, [document.id, document.imageUrl]);

  const getVisualDocumentBg = (doc: any) => {
    if (resolvedImageUrl) return resolvedImageUrl;
    if (doc.imageUrl && !doc.imageUrl.startsWith('indexeddb:')) return doc.imageUrl;
    const title = doc.title || "Documento de Estudio";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="100%" height="100%">
        <rect width="800" height="1100" fill="#FAF9F5" rx="6" />
        <line x1="40" y1="0" x2="40" y2="1100" stroke="#F1F0EA" stroke-width="1.5" />
        <line x1="760" y1="0" x2="760" y2="1100" stroke="#F1F0EA" stroke-width="1.5" />
        <rect x="30" y="30" width="740" height="1040" fill="none" stroke="#E6E4D9" stroke-width="1" stroke-dasharray="4" rx="4" />
        <g transform="translate(60, 70)">
          <rect width="90" height="24" rx="4" fill="#EF4444" />
          <text x="45" y="16" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="10" font-weight="900" text-anchor="middle" letter-spacing="1">ESCANEADO</text>
          <text x="105" y="16" fill="#78716C" font-family="system-ui, sans-serif" font-size="11" font-weight="600">Lectura Activa • Copia de Estudio</text>
        </g>
        <text x="60" y="150" fill="#1C1917" font-family="system-ui, sans-serif" font-size="22" font-weight="800">${title}</text>
        <line x1="60" y1="165" x2="740" y2="165" stroke="#D6D3D1" stroke-width="2" />
        <g transform="translate(60, 200)">
          <text x="0" y="20" fill="#44403C" font-family="system-ui, sans-serif" font-size="13" font-weight="700">MODO IMAGEN / PANTALLA COMPLETA</text>
          <text x="0" y="40" fill="#78716C" font-family="system-ui, sans-serif" font-size="11" font-style="italic">Este archivo se ha cargado en formato visual debido a su estructura de origen o formato de imagen.</text>
          <rect x="0" y="70" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="90" width="650" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="110" width="670" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="130" width="450" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="170" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="190" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="210" width="580" height="10" rx="2" fill="#E7E5E4" />
          <rect x="40" y="250" width="600" height="240" rx="8" fill="#F5F5F4" stroke="#E7E5E4" stroke-width="1.5" />
          <path d="M 140 440 C 240 320, 340 360, 440 300 C 540 240, 580 400, 640 440" fill="none" stroke="#D6D3D1" stroke-width="3" stroke-linecap="round" />
          <circle cx="340" cy="340" r="35" fill="none" stroke="#6366F1" stroke-width="3" />
          <text x="340" y="420" fill="#A8A29E" font-family="system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle">Ilustración / Diagrama de Estudio</text>
          <rect x="0" y="520" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="540" width="660" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="560" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="580" width="500" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="620" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="640" width="680" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="660" width="620" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="680" width="410" height="10" rx="2" fill="#E7E5E4" />
          <rect x="0" y="730" width="680" height="1" fill="#E7E5E4" />
          <text x="0" y="755" fill="#A8A29E" font-family="system-ui, sans-serif" font-size="10">Estrategias Lectura Activa habilitadas para subrayado libre, notas al margen y predicciones.</text>
        </g>
        <g transform="translate(640, 930)">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#6366F1" stroke-width="1.5" stroke-dasharray="4" />
          <text x="50" y="46" fill="#6366F1" font-family="system-ui, sans-serif" font-size="9" font-weight="800" text-anchor="middle">COMPRENSIÓN</text>
          <text x="50" y="58" fill="#6366F1" font-family="system-ui, sans-serif" font-size="9" font-weight="800" text-anchor="middle">LECTORA</text>
        </g>
        <text x="400" y="1065" fill="#A8A29E" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">Pág 1/1 • Lectura Activa</text>
      </svg>
    `;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleNextPage = () => {
    if (document.pages && currentPageIndex < document.pages.length - 1) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handleTextLayerMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0) {
      setSelectedText(selectedText);
      const range = selection.getRangeAt(0);
      const containerRect = textLayerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const selectionRect = range.getBoundingClientRect();
        const x = ((selectionRect.left - containerRect.left) / containerRect.width) * 100;
        const y = ((selectionRect.top - containerRect.top) / containerRect.height) * 100;
        const w = (selectionRect.width / containerRect.width) * 100;
        const h = (selectionRect.height / containerRect.height) * 100;

        setPdfSelectionCoords({ x, y, w, h, pageIndex: currentPageIndex });
      }
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setEditingHighlightColorId(null);
    if (document.hasPdfRaw && (enabledStrategies.highlight || enabledStrategies.annotation) && pdfSelectionMode === 'text') {
      // Allow native textLayer selection in PDF mode instead of visual dragging box
      return;
    }

    // Prevent default browser dragging of images/text when custom drawing or interacting
    if (enabledStrategies.highlight || enabledStrategies.annotation || enabledStrategies.prediction) {
      e.preventDefault();
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    if (enabledStrategies.highlight || enabledStrategies.annotation) {
      setIsDragging(true);
      setDragStart({ x: clickX, y: clickY });
      setDragCurrent({ x: clickX, y: clickY });
    } else if (enabledStrategies.prediction) {
      const text = prompt("Escribe tu predicción para este punto del documento:");
      if (text && text.trim()) {
        onAddPrediction(text.trim(), { x: clickX, y: clickY, pageIndex: currentPageIndex });
      }
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    setDragCurrent({ x: clickX, y: clickY });
  };

  const handleImageMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !dragCurrent) return;
    setIsDragging(false);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 100;
    const endY = ((e.clientY - rect.top) / rect.height) * 100;

    let x = Math.min(dragStart.x, endX);
    let y = Math.min(dragStart.y, endY);
    let w = Math.abs(dragStart.x - endX);
    let h = Math.abs(dragStart.y - endY);

    setDragStart(null);
    setDragCurrent(null);

    // If it's a very small drag, consider it a standard click
    const isJustClick = w < 1 || h < 1;
    if (isJustClick) {
      x = dragStart.x - 1.5;
      y = dragStart.y - 1.5;
      w = 3;
      h = 3;
    }

    if (enabledStrategies.highlight) {
      if (!isJustClick) {
        const color = visibleColors[0] || 'yellow';
        const label = colorLabels[color] || 'Destacado';
        onAddHighlight(
          `Subrayado visual (${Math.round(x)}%, ${Math.round(y)}%)`, 
          color, 
          label, 
          { x, y, w, h, pageIndex: currentPageIndex }
        );
      }
    } else if (enabledStrategies.annotation) {
      const comment = prompt("Escribe tu anotación para este punto del documento:");
      if (comment && comment.trim()) {
        const highlightId = onAddHighlight(
          `Comentario visual en (${Math.round(x + w / 2)}%, ${Math.round(y + h / 2)}%)`, 
          'orange', 
          'Nota al Margen', 
          { x, y, w, h, pageIndex: currentPageIndex }
        );
        onAddAnnotation(highlightId, comment.trim(), { x: x + w / 2, y: y + h / 2, pageIndex: currentPageIndex });
      }
    }
  };

  const handleMergeAndCompileVisualDoc = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = window.document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const docHighlights = highlights.filter(h => h.documentId === document.id && h.x !== undefined);
      const docAnnotations = annotations.filter(a => a.documentId === document.id && a.x !== undefined);
      const docPredictions = predictions.filter(p => p.documentId === document.id && p.x !== undefined);

      // Draw highlights
      docHighlights.forEach(hl => {
        const colorsRGBA: Record<HighlightColor, string> = {
          yellow: 'rgba(253, 224, 71, 0.4)',
          green: 'rgba(74, 222, 128, 0.4)',
          blue: 'rgba(96, 165, 250, 0.4)',
          orange: 'rgba(251, 146, 60, 0.4)',
          red: 'rgba(248, 113, 113, 0.4)'
        };
        const colorsHex: Record<HighlightColor, string> = {
          yellow: '#facc15',
          green: '#4ade80',
          blue: '#60a5fa',
          orange: '#fbc02d',
          red: '#ef4444'
        };

        ctx.fillStyle = colorsRGBA[hl.color] || 'rgba(253, 224, 71, 0.4)';
        const xPx = (hl.x! / 100) * canvas.width;
        const yPx = (hl.y! / 100) * canvas.height;
        const wPx = (hl.w! / 100) * canvas.width;
        const hPx = (hl.h! / 100) * canvas.height;

        ctx.fillRect(xPx, yPx, wPx, hPx);
        ctx.strokeStyle = colorsHex[hl.color] || '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xPx, yPx, wPx, hPx);
      });

      // Draw annotations
      docAnnotations.forEach((ann, i) => {
        const xPx = (ann.x! / 100) * canvas.width;
        const yPx = (ann.y! / 100) * canvas.height;

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(xPx, yPx, 13, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, xPx, yPx);
      });

      // Draw predictions
      docPredictions.forEach(pred => {
        const xPx = (pred.x! / 100) * canvas.width;
        const yPx = (pred.y! / 100) * canvas.height;

        ctx.fillStyle = pred.status === 'correct' ? '#16a34a' : pred.status === 'incorrect' ? '#dc2626' : '#4f46e5';
        ctx.beginPath();
        ctx.arc(xPx, yPx, 13, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', xPx, yPx);
      });

      // Legend block at bottom
      if (docAnnotations.length > 0 || docPredictions.length > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(40, canvas.height - 240, canvas.width - 80, 200);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, canvas.height - 240, canvas.width - 80, 200);
        
        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('APUNTES DE ESTUDIO LECTURA ACTIVA', 60, canvas.height - 215);

        let yOffset = canvas.height - 185;
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';

        let itemIndex = 1;
        docAnnotations.slice(0, 5).forEach((ann, idx) => {
          ctx.fillStyle = '#fb923c';
          ctx.fillText(`Nota ${idx + 1}:`, 60, yOffset);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(ann.comment.length > 80 ? ann.comment.substring(0, 80) + '...' : ann.comment, 115, yOffset);
          yOffset += 20;
          itemIndex++;
        });

        docPredictions.slice(0, 3).forEach((pred, idx) => {
          if (itemIndex > 8) return;
          ctx.fillStyle = '#818cf8';
          ctx.fillText(`Predicción ${idx + 1}:`, 60, yOffset);
          ctx.fillStyle = '#e2e8f0';
          const statText = pred.status === 'correct' ? 'CUMPLIDA' : pred.status === 'incorrect' ? 'FALLIDA' : 'PENDIENTE';
          ctx.fillText(`[${statText}] ${pred.text.length > 70 ? pred.text.substring(0, 70) + '...' : pred.text}`, 150, yOffset);
          yOffset += 20;
          itemIndex++;
        });
      }

      const compiledImage = canvas.toDataURL('image/jpeg', 0.95);
      
      try {
        const jspdfLib = await loadJsPDF();
        const { jsPDF } = jspdfLib;
        
        // Create matching size PDF
        const pdfDoc = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdfDoc.addImage(compiledImage, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdfDoc.save(`Lectura_Compilada_${document.title}.pdf`);
        
        if (onAddCompiledDocument) {
          onAddCompiledDocument(`[Compilado] ${document.title}`, compiledImage);
        }
        alert(`¡Éxito! Se ha unido la pantalla de estrategias con la imagen y se ha guardado como archivo PDF en tus descargas.`);
      } catch (pdfErr: any) {
        console.error("Error creating PDF with jsPDF:", pdfErr);
        if (onAddCompiledDocument) {
          onAddCompiledDocument(`[Compilado] ${document.title}`, compiledImage);
          alert(`¡Éxito! Se ha unido la pantalla de estrategias con la imagen en una nueva copia guardada en tu biblioteca.`);
        } else {
          const link = window.document.createElement('a');
          link.download = `Lectura_Compilada_${document.title}.png`;
          link.href = compiledImage;
          link.click();
        }
      }
    };
    img.src = getVisualDocumentBg(document);
  };

  // Active strategies state: multiple strategies can be enabled at the same time
  const [enabledStrategies, setEnabledStrategies] = useState<Record<'highlight' | 'annotation' | 'prediction' | 'report', boolean>>({
    highlight: false,
    annotation: false,
    prediction: false,
    report: false,
  });
  const [pdfSelectionMode, setPdfSelectionMode] = useState<'text' | 'box'>('text');
  const [floatingMenuMode, setFloatingMenuMode] = useState<'options' | 'highlight' | 'annotation' | 'prediction' | null>(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number; visible: boolean; text: string } | null>(null);
  
  // Highlighting selected text state
  const [selectedText, setSelectedText] = useState('');
  const [editingHighlightColorId, setEditingHighlightColorId] = useState<string | null>(null);

  // Tooltip for text-based highlights
  const [textTooltip, setTextTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const textTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const highlightId = target.getAttribute('data-highlight-id');
    // Only process text highlights (with data-highlight-id, NOT data-visual-highlight-id)
    if (highlightId && !target.hasAttribute('data-visual-highlight-id')) {
      const hl = highlights.find(h => h.id === highlightId);
      if (hl) {
        const label = colorLabels[hl.color]?.trim();
        if (label) {
          const rect = target.getBoundingClientRect();
          const containerRect = viewerRef.current?.getBoundingClientRect();
          if (containerRect) {
            if (textTooltipTimerRef.current) clearTimeout(textTooltipTimerRef.current);
            
            setTextTooltip({
              label,
              x: rect.left - containerRect.left + rect.width / 2,
              y: rect.top - containerRect.top - 10 + (viewerRef.current?.scrollTop || 0),
            });

            textTooltipTimerRef.current = setTimeout(() => {
              setTextTooltip(null);
            }, 3000);
          }
        }
      }
    }
  };

  const handleTextMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('data-highlight-id')) {
      if (textTooltipTimerRef.current) clearTimeout(textTooltipTimerRef.current);
      setTextTooltip(null);
    }
  };

  useEffect(() => {
    return () => {
      if (textTooltipTimerRef.current) {
        clearTimeout(textTooltipTimerRef.current);
      }
    };
  }, []);

  // Clear editing color picker on document/page changes
  useEffect(() => {
    setEditingHighlightColorId(null);
  }, [currentPageIndex, document.id]);
  
  // Strategy 1: Highlight Custom Color Labels (Defaults to blank as per user instruction)
  const [colorLabels, setColorLabels] = useState<Record<HighlightColor, string>>(() => {
    const saved = localStorage.getItem('lectura_activa_color_labels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      yellow: '',
      green: '',
      blue: '',
      orange: '',
      red: ''
    };
  });

  // Visible Colors state: default to 1 color, up to 5 colors
  const [visibleColors, setVisibleColors] = useState<HighlightColor[]>(() => {
    const saved = localStorage.getItem('lectura_activa_visible_colors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return ['yellow']; // Default is 1 color
  });

  const allColors: HighlightColor[] = ['yellow', 'green', 'blue', 'orange', 'red'];

  const handleAddColor = () => {
    const nextColor = allColors.find(c => !visibleColors.includes(c));
    if (nextColor) {
      setVisibleColors(prev => [...prev, nextColor]);
    }
  };

  const handleRemoveColor = (color: HighlightColor) => {
    if (visibleColors.length > 1) {
      setVisibleColors(prev => prev.filter(c => c !== color));
    }
  };

  // Strategy 2: Annotations margin form state
  const [marginCommentInput, setMarginCommentInput] = useState('');
  const [showMarginForm, setShowMarginForm] = useState(false);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
  const marginCommentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Strategy 3: Predictions form state
  const [predictionInput, setPredictionInput] = useState('');
  const [showPredictionForm, setShowPredictionForm] = useState(false);
  const [predictionSelectionInput, setPredictionSelectionInput] = useState('');

  // Print options checklist modal state
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    highlights: true,
    annotations: true,
    predictions: true,
  });

  const viewerRef = useRef<HTMLDivElement>(null);

  // Sync color labels to local storage
  useEffect(() => {
    localStorage.setItem('lectura_activa_color_labels', JSON.stringify(colorLabels));
  }, [colorLabels]);

  // Sync visible colors to local storage
  useEffect(() => {
    localStorage.setItem('lectura_activa_visible_colors', JSON.stringify(visibleColors));
  }, [visibleColors]);

  // Scroll selected highlight into view when selectedHighlight changes
  useEffect(() => {
    if (selectedHighlight) {
      // Small timeout to allow DOM to render or switch pages if needed
      const timer = setTimeout(() => {
        // Look for mark in text view
        const element = window.document.querySelector(`[data-highlight-id="${selectedHighlight.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // If in PDF/visual view, find the visual highlight box and scroll to it
          const visualEl = window.document.querySelector(`[data-visual-highlight-id="${selectedHighlight.id}"]`);
          if (visualEl) {
            visualEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedHighlight]);

  // Color theme specifications
  const colorClasses: Record<HighlightColor, { bg: string; border: string; hover: string; text: string; hex: string; lightHex: string }> = {
    yellow: {
      bg: 'bg-yellow-200/70',
      border: 'border-yellow-400',
      hover: 'hover:bg-yellow-300/90',
      text: 'text-yellow-800',
      hex: '#facc15',
      lightHex: '#fefce8'
    },
    green: {
      bg: 'bg-green-200/70',
      border: 'border-green-400',
      hover: 'hover:bg-green-300/90',
      text: 'text-green-800',
      hex: '#4ade80',
      lightHex: '#f0fdf4'
    },
    blue: {
      bg: 'bg-blue-200/70',
      border: 'border-blue-400',
      hover: 'hover:bg-blue-300/90',
      text: 'text-blue-800',
      hex: '#60a5fa',
      lightHex: '#eff6ff'
    },
    orange: {
      bg: 'bg-orange-200/70',
      border: 'border-orange-400',
      hover: 'hover:bg-orange-300/90',
      text: 'text-orange-800',
      hex: '#fb923c',
      lightHex: '#fff7ed'
    },
    red: {
      bg: 'bg-red-200/70',
      border: 'border-red-400',
      hover: 'hover:bg-red-300/90',
      text: 'text-red-800',
      hex: '#f87171',
      lightHex: '#fee2e2'
    }
  };

  // Close floating menus and dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#kebab-menu-container')) {
        setKebabOpen(false);
      }
      if (!target.closest('#floating-highlight-menu')) {
        setFloatingMenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /**
   * Capture text selection events and show floating menu
   */
  const handleMouseUp = () => {
    // Only show floating menu if an interactive strategy is active
    const activeCount = 
      (enabledStrategies.highlight ? 1 : 0) +
      (enabledStrategies.annotation ? 1 : 0) +
      (enabledStrategies.prediction ? 1 : 0);

    if (activeCount === 0) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    if (text.length === 0) {
      return;
    }

    if (text.length > 500) {
      return;
    }

    setSelectedText(text);

    // Set floating menu mode
    if (activeCount > 1) {
      setFloatingMenuMode('options');
    } else {
      if (enabledStrategies.highlight) setFloatingMenuMode('highlight');
      else if (enabledStrategies.annotation) setFloatingMenuMode('annotation');
      else if (enabledStrategies.prediction) setFloatingMenuMode('prediction');
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const viewerRect = viewerRef.current?.getBoundingClientRect();

      if (viewerRect) {
        setFloatingMenu({
          x: rect.left - viewerRect.left + rect.width / 2,
          y: rect.top - viewerRect.top - 50 + (viewerRef.current?.scrollTop || 0),
          visible: true,
          text: text
        });
      }
    } catch (e) {
      // Ignore range failures
    }
  };

  /**
   * Highlight text using float menu action
   */
  const handleHighlightAction = (color: HighlightColor, category: string) => {
    if (!floatingMenu) return;
    
    if (selectedHighlight) {
      if (onUpdateHighlightColor) {
        onUpdateHighlightColor(selectedHighlight.id, color);
      }
    } else {
      const coords = pdfSelectionCoords || undefined;
      onAddHighlight(floatingMenu.text, color, category, coords);
    }
    
    setFloatingMenu(null);
    setPdfSelectionCoords(null);
    setSelectedText('');
    onSelectHighlight(null);
    window.getSelection()?.removeAllRanges();
  };

  /**
   * Delete highlight from selection or selectedHighlight
   */
  const handleDeleteHighlightFromSelection = () => {
    if (selectedHighlight) {
      onDeleteHighlight(selectedHighlight.id);
      onSelectHighlight(null);
      setFloatingMenu(null);
    } else if (floatingMenu?.text) {
      // Find highlight matching selected text in current document
      const matchingHl = highlights.find(
        h => h.documentId === document.id && h.text.toLowerCase() === floatingMenu.text.toLowerCase()
      );
      if (matchingHl) {
        onDeleteHighlight(matchingHl.id);
      } else {
        // Find any highlight whose text is included in or includes the selection
        const overlappingHl = highlights.find(
          h => h.documentId === document.id && 
          (h.text.toLowerCase().includes(floatingMenu.text.toLowerCase()) || 
           floatingMenu.text.toLowerCase().includes(h.text.toLowerCase()))
        );
        if (overlappingHl) {
          onDeleteHighlight(overlappingHl.id);
        }
      }
      setFloatingMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  /**
   * Action trigger when the user clicks '💬 Comentar Selección' button above the title
   */
  const handleCreateMarginNote = () => {
    if (!selectedText.trim()) {
      alert('Por favor, selecciona primero una sección de texto dentro del documento para poder comentarla al costado.');
      return;
    }
    setMarginCommentInput('');
    setShowMarginForm(true);
    setTimeout(() => {
      marginCommentTextareaRef.current?.focus();
    }, 150);
  };

  /**
   * Submit custom margin annotation
   */
  const handleSaveMarginAnnotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marginCommentInput.trim()) return;

    const coords = pdfSelectionCoords || undefined;
    const pinCoords = pdfSelectionCoords ? {
      x: pdfSelectionCoords.x + pdfSelectionCoords.w / 2,
      y: pdfSelectionCoords.y + pdfSelectionCoords.h / 2,
      pageIndex: pdfSelectionCoords.pageIndex
    } : undefined;

    const textToSave = selectedText.trim() || `Comentario en pág. ${currentPageIndex + 1}`;

    // Create highlight first using Orange/Note style labeled "Nota al Margen"
    const hlId = onAddHighlight(textToSave, 'orange', 'Nota al Margen', coords);
    if (hlId) {
      // Save associated comment
      onAddAnnotation(hlId, marginCommentInput.trim(), pinCoords);
      setMarginCommentInput('');
      setSelectedText('');
      setPdfSelectionCoords(null);
      setShowMarginForm(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  /**
   * Add highlight from active desk palette toolbar
   */
  const handlePaletteHighlight = (color: HighlightColor) => {
    if (!selectedText.trim()) {
      alert('Primero selecciona texto en el documento y luego haz clic en el color del lápiz para subrayarlo.');
      return;
    }
    const label = colorLabels[color] || 'Destacado';
    const coords = pdfSelectionCoords || undefined;
    onAddHighlight(selectedText, color, label, coords);
    setSelectedText('');
    setPdfSelectionCoords(null);
    window.getSelection()?.removeAllRanges();
  };

  /**
   * Update color label dynamically from input fields
   */
  const handleColorLabelChange = (color: HighlightColor, val: string) => {
    setColorLabels(prev => ({
      ...prev,
      [color]: val
    }));
  };

  /**
   * Submit a reading prediction
   */
  const handleSavePredictionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictionInput.trim()) return;
    onAddPrediction(predictionInput.trim());
    setPredictionInput('');
  };

  /**
   * Submit a reading prediction from selection
   */
  const handleSavePredictionFromSelectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText.trim() || !predictionSelectionInput.trim()) return;

    const textToSave = `Sobre "${selectedText.substring(0, 60)}${selectedText.length > 60 ? '...' : ''}": ${predictionSelectionInput.trim()}`;
    const pinCoords = pdfSelectionCoords ? {
      x: pdfSelectionCoords.x + pdfSelectionCoords.w / 2,
      y: pdfSelectionCoords.y + pdfSelectionCoords.h / 2,
      pageIndex: pdfSelectionCoords.pageIndex
    } : undefined;

    onAddPrediction(textToSave, pinCoords);
    setPredictionSelectionInput('');
    setSelectedText('');
    setPdfSelectionCoords(null);
    setShowPredictionForm(false);
    window.getSelection()?.removeAllRanges();
  };

  /**
   * Generate highly polished HTML designed for print/PDF output
   */
  const handlePrintDocument = (
    withStrategies: boolean,
    options: { highlights: boolean; annotations: boolean; predictions: boolean } = { highlights: true, annotations: true, predictions: true }
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('El navegador bloqueó la ventana emergente de impresión. Por favor, habilita las ventanas emergentes en tu navegador para poder imprimir.');
      return;
    }

    const docTitle = document.title;
    const docDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let bodyContent = '';

    if (withStrategies) {
      const docHighlights = highlights.filter(h => h.documentId === document.id);
      const docAnnotations = annotations.filter(a => a.documentId === document.id);
      const docPredictions = predictions.filter(p => p.documentId === document.id);

      const hasSidebar = (options.annotations && docAnnotations.length > 0) || (options.predictions && docPredictions.length > 0);

      if (hasSidebar) {
        let sidebarHtml = '';

        if (options.annotations && docAnnotations.length > 0) {
          sidebarHtml += `
            <div className="sidebar-section">
              <h3>Anotaciones</h3>
              ${docAnnotations.map((ann, i) => {
                const hl = docHighlights.find(h => h.id === ann.highlightId);
                const colorLabel = hl ? (colorLabels[hl.color] || 'Destacado') : 'Anotación';
                return `
                  <div className="annotation-card" style="border-left: 4px solid ${hl ? colorClasses[hl.color].hex : '#4f46e5'}">
                    <div className="annotation-meta font-semibold">
                      Anotación #${i + 1} &bull; ${colorLabel}
                    </div>
                    ${hl ? `<div className="quoted-text">"${hl.text.substring(0, 100)}${hl.text.length > 100 ? '...' : ''}"</div>` : ''}
                    <div className="annotation-comment">${ann.comment}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }

        if (options.predictions && docPredictions.length > 0) {
          const statusLabels = { pending: 'Pendiente', correct: 'Acertada', incorrect: 'Errada' };
          sidebarHtml += `
            <div className="sidebar-section">
              <h3>Predicciones</h3>
              ${docPredictions.map((p, i) => `
                <div className="prediction-card-print ${p.status}">
                  <div className="prediction-meta">
                    <strong>Predicción #${i + 1}</strong>
                    <span className="badge-print ${p.status}">${statusLabels[p.status]}</span>
                  </div>
                  <div className="prediction-text">${p.text}</div>
                </div>
              `).join('')}
            </div>
          `;
        }

        bodyContent += `
          <div className="print-layout">
            <div className="reading-column">
              <h2>Texto de Lectura</h2>
              <div className="reading-text text-justify">
                ${renderDocumentWithHighlights(options.highlights)}
              </div>
            </div>
            <div className="sidebar-column">
              ${sidebarHtml}
            </div>
          </div>
        `;
      } else {
        bodyContent += `
          <div className="print-section">
            <h2>Texto de Lectura</h2>
            <div className="reading-text text-justify">
              ${renderDocumentWithHighlights(options.highlights)}
            </div>
          </div>
        `;
      }
    } else {
      // Print completely clean base text
      let cleanContent = '';
      if (document.format === 'markdown') {
        cleanContent = parseMarkdown(document.content);
      } else if (document.format === 'html') {
        cleanContent = document.content;
      } else {
        cleanContent = document.content
          .split('\n')
          .map(p => p.trim() ? `<p className="my-3 text-justify">${p}</p>` : '')
          .join('\n');
      }

      bodyContent += `
        <div className="print-section">
          <h2>Contenido de Lectura (Texto Limpio)</h2>
          <div className="reading-text text-justify">
            ${cleanContent}
          </div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Impresión de Lectura - ${docTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 40px;
            background: #fff;
          }

          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 5px;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 12px;
          }

          .header-meta {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          h2 {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 25px;
            margin-bottom: 15px;
          }

          p {
            margin-bottom: 15px;
            text-align: justify;
          }

          .reading-text {
            font-size: 15px;
            color: #334155;
          }

          blockquote.quoted-text {
            font-style: italic;
            border-left: 3px solid #cbd5e1;
            padding-left: 12px;
            color: #475569;
            margin: 10px 0;
            font-size: 14px;
          }

          mark {
            background-color: rgba(254, 240, 138, 0.7);
            color: #1e293b;
            padding: 2px 4px;
            border-radius: 3px;
          }

          .annotation-card {
            padding: 12px;
            margin-bottom: 15px;
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
            font-size: 13px;
          }

          .annotation-meta {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
          }

          .annotation-card .quoted-text {
            font-style: italic;
            color: #475569;
            margin-bottom: 6px;
            border-left: 2px solid #cbd5e1;
            padding-left: 6px;
            font-size: 12px;
          }

          .annotation-comment {
            font-weight: 500;
            font-size: 13px;
            color: #0f172a;
            margin-top: 6px;
          }

          .predictions-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          .predictions-table th, .predictions-table td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
          }

          .predictions-table th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #334155;
          }

          .badge {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            display: inline-block;
          }

          .pending { background-color: #f1f5f9; color: #475569; }
          .correct { background-color: #dcfce7; color: #166534; }
          .incorrect { background-color: #fee2e2; color: #991b1b; }

          .break-before {
            page-break-before: always;
          }

          /* Side-by-side Layout for active strategies print */
          .print-layout {
            display: flex;
            gap: 30px;
            align-items: flex-start;
          }

          .reading-column {
            flex: 1;
            min-width: 0;
          }

          .sidebar-column {
            width: 270px;
            flex-shrink: 0;
            border-left: 2px solid #cbd5e1;
            padding-left: 20px;
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .sidebar-section h3 {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }

          .prediction-card-print {
            padding: 10px 12px;
            margin-bottom: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            font-size: 12px;
          }

          .prediction-card-print.correct {
            border-color: #a7f3d0;
            background-color: #f0fdf4;
          }

          .prediction-card-print.incorrect {
            border-color: #fca5a5;
            background-color: #fef2f2;
          }

          .prediction-meta {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .badge-print {
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
          }

          .badge-print.pending { background: #e2e8f0; color: #475569; }
          .badge-print.correct { background: #dcfce7; color: #15803d; }
          .badge-print.incorrect { background: #fee2e2; color: #b91c1c; }

          .prediction-text {
            color: #334155;
            font-weight: 500;
          }

          @media print {
            body {
              margin: 20px;
            }
            .break-before {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <h1>${docTitle}</h1>
        <div className="header-meta">
          <span><strong>Estudiante / Lector:</strong> ${studentName || 'Gabriel Ribet'}</span>
          <span><strong>Fecha de Impresión:</strong> ${docDate}</span>
        </div>

        ${bodyContent}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  /**
   * Render document content inline with highlights wrapped safely
   */
  const renderDocumentWithHighlights = (showHighlights: boolean = true) => {
    let displayHtml = '';
    if (document.format === 'markdown') {
      displayHtml = parseMarkdown(document.content);
    } else if (document.format === 'html') {
      displayHtml = document.content;
    } else {
      displayHtml = document.content
        .split('\n')
        .map(p => p.trim() ? `<p className="my-3 text-slate-700 leading-relaxed text-justify">${p}</p>` : '')
        .join('\n');
    }

    if (!showHighlights) {
      return displayHtml;
    }

    const docHighlights = highlights.filter(h => h.documentId === document.id);
    const sortedHighlights = [...docHighlights].sort((a, b) => b.text.length - a.text.length);

    let finalHtml = displayHtml;

    sortedHighlights.forEach(h => {
      const escapedText = h.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?![^<]*>)(${escapedText})`, 'gi');

      const style = colorClasses[h.color] || colorClasses.yellow;
      const isSelected = selectedHighlight?.id === h.id;

      finalHtml = finalHtml.replace(regex, (match) => {
        const isNote = h.color === 'orange' || h.category === 'Nota al Margen';
        const noteIconHtml = isNote 
          ? `<span class="inline-flex items-center justify-center bg-orange-500 text-white text-[10px] rounded-full w-4 h-4 ml-1 font-bold select-none cursor-pointer align-middle shadow-xs hover:bg-orange-600 transition-all" title="Anotación al Margen">💬</span>` 
          : '';

        return `<mark 
          className="highlight-node cursor-pointer transition-all px-1 py-0.5 rounded font-medium border-b-2 ${
            isSelected 
              ? 'ring-4 ring-indigo-600 ring-offset-1 shadow-lg scale-110 z-10 bg-indigo-100 border-indigo-600 animate-pulse' 
              : `${style.bg} ${style.border} ${style.hover}`
          }" 
          data-highlight-id="${h.id}"
          title="Estrategia: ${h.category}"
        >${match}</mark>${noteIconHtml}`;
      });
    });

    return finalHtml;
  };

  const handleViewerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const highlightId = target.getAttribute('data-highlight-id');
    
    if (highlightId) {
      const match = highlights.find(h => h.id === highlightId);
      if (match) {
        onSelectHighlight(match);
        // Show floating menu for deleting or changing color of this highlight!
        const rect = target.getBoundingClientRect();
        const viewerRect = viewerRef.current?.getBoundingClientRect();
        if (viewerRect) {
          setFloatingMenu({
            x: rect.left - viewerRect.left + rect.width / 2,
            y: rect.top - viewerRect.top - 50 + (viewerRef.current?.scrollTop || 0),
            visible: true,
            text: match.text
          });
          setFloatingMenuMode('highlight');
        }
      }
    } else {
      onSelectHighlight(null);
    }
  };

  // Helper lists filtered for the current document
  const docHighlights = highlights.filter(h => h.documentId === document.id);
  const docAnnotations = annotations.filter(a => a.documentId === document.id);
  const docPredictions = predictions.filter(p => p.documentId === document.id);

  // Academic exports
  const handleExportMarkdown = () => {
    let md = `# Reporte de Lectura Activa: ${document.title}\n\n`;
    md += `*Lector:* ${studentName}\n`;
    md += `*Fecha:* ${new Date().toLocaleDateString()}\n\n`;

    md += `## 1. Notas y Subrayados por Código de Colores\n\n`;
    (Object.keys(colorLabels) as HighlightColor[]).forEach(color => {
      const label = colorLabels[color];
      const stratHighlights = docHighlights.filter(h => h.color === color);
      if (stratHighlights.length > 0) {
        md += `### [${label.toUpperCase()}]\n`;
        stratHighlights.forEach((h, index) => {
          md += `${index + 1}. **"${h.text}"**\n`;
          const note = docAnnotations.find(a => a.highlightId === h.id);
          if (note) {
            md += `   *Anotación al Margen:* ${note.comment}\n`;
          }
          md += `\n`;
        });
      }
    });

    md += `## 2. Predicciones Lectoras Formuladas\n\n`;
    if (docPredictions.length === 0) {
      md += `*No se registraron predicciones en esta sesión.*\n`;
    } else {
      docPredictions.forEach((p, index) => {
        const statusMap = { pending: 'Pendiente', correct: 'Acertada', incorrect: 'Desacertada' };
        md += `${index + 1}. **Predicción:** ${p.text}\n`;
        md += `   *Resultado:* ${statusMap[p.status]}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Lectura_${document.title.replace(/\s+/g, '_')}.md`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleExportHTMLReport = () => {
    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Académico - ${document.title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1 { font-size: 28px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 5px; }
        .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
        h2 { font-size: 20px; color: #0f172a; margin-top: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
        .highlight-box { padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 5px solid; background-color: #f8fafc; }
        .yellow { border-left-color: #facc15; background-color: #fefce8; }
        .green { border-left-color: #4ade80; background-color: #f0fdf4; }
        .blue { border-left-color: #60a5fa; background-color: #eff6ff; }
        .orange { border-left-color: #fb923c; background-color: #fff7ed; }
        .red { border-left-color: #f87171; background-color: #fee2e2; }
        .quote { font-style: italic; font-weight: bold; font-size: 16px; margin: 0 0 10px 0; }
        .note { font-size: 14px; color: #475569; background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px; }
        .note-title { font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; margin-bottom: 3px; }
        .prediction-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .badge { font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; }
        .pending { background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .correct { background-color: #dcfce7; color: #166534; }
        .incorrect { background-color: #fee2e2; color: #991b1b; }
        .header-logo { color: #4f46e5; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div className="header-logo">Visualizador de Lectura Activa</div>
      <h1>Informe de Repaso Académico</h1>
      <div className="meta">
        <strong>Lector:</strong> ${studentName} <br/>
        <strong>Documento analizado:</strong> ${document.title} <br/>
        <strong>Fecha de estudio:</strong> ${new Date().toLocaleDateString()} <br/>
        <strong>Sincronización Cloud:</strong> Activa y verificada
      </div>

      <h2>I. Subrayados Científicos y Anotaciones al Margen</h2>
    `;

    if (docHighlights.length === 0) {
      html += `<p>No se realizaron subrayados ni marcas en esta sesión de lectura.</p>`;
    } else {
      docHighlights.forEach(h => {
        const note = docAnnotations.find(a => a.highlightId === h.id);
        html += `
          <div className="highlight-box ${h.color}">
            <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 5px;">ESTRATEGIA: ${h.category.toUpperCase()}</div>
            <p className="quote">"${h.text}"</p>
            ${note ? `
              <div className="note">
                <div className="note-title">Anotación al Margen:</div>
                ${note.comment}
              </div>
            ` : ''}
          </div>
        `;
      });
    }

    html += `
      <h2>II. Registro de Predicciones y Comprobación de Hipótesis</h2>
    `;

    if (docPredictions.length === 0) {
      html += `<p>No se registraron predicciones en esta sesión.</p>`;
    } else {
      docPredictions.forEach(p => {
        const badgeColor = p.status === 'correct' ? 'correct' : p.status === 'incorrect' ? 'incorrect' : 'pending';
        const statusText = p.status === 'correct' ? 'Acertada' : p.status === 'incorrect' ? 'Desacertada' : 'Pendiente de Lectura';
        html += `
          <div className="prediction-card">
            <span style="font-weight: 500;">${p.text}</span>
            <span className="badge ${badgeColor}">${statusText}</span>
          </div>
        `;
      });
    }

    html += `
      <footer style="margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Visualizador de Lectura Activa &copy; 2026 - Generado de forma segura para revisión docente.
      </footer>
    </body>
    </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Informe_Lectura_${document.title.replace(/\s+/g, '_')}.html`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const payload = {
      document,
      highlights: docHighlights,
      annotations: docAnnotations,
      predictions: docPredictions,
      colorLabels,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LecturaActiva_Respaldo_${document.id}.json`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div id="document-viewer-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full relative overflow-hidden">
      
      {/* Header bar with Document Info, Kebab Menu, and Offline Badge */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        
        {/* Left: Back to Home & Document Info */}
        <div className="flex items-center gap-3">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="mr-1 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200 bg-white"
              title="Volver a mis Lecturas"
            >
              <ArrowLeft size={16} />
              <span className="text-xs font-bold ml-1">Inicio</span>
            </button>
          )}
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <BookOpen size={18} />
          </div>
          <div>
            
            {/* Conditional Button directly above document title */}
            {enabledStrategies.annotation && (
              <div className="mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <button 
                  id="btn-comment-above-title"
                  onClick={handleCreateMarginNote}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-sm cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <MessageSquare size={12} />
                  💬 Crear Nota al Margen
                </button>
              </div>
            )}

            <h2 className="font-semibold text-slate-800 text-sm md:text-base tracking-tight leading-tight">
              {document.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-slate-400 uppercase">
                Formato: {document.format}
              </span>
              <span className="text-slate-300 text-xs">•</span>
              <span className="text-xs text-indigo-600 font-medium">
                {docHighlights.length} Subrayados activos
              </span>
            </div>
          </div>
        </div>

        {/* Right: Kebab Menu & Sync Status */}
        <div className="flex items-center gap-3">
          
          {/* Sincronización status */}
          <div className="hidden sm:block">
            {navigator.onLine ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                En Línea
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Offline
              </span>
            )}
          </div>

          {/* KEBAB STRATEGIES DROPDOWN MENU */}
          <div id="kebab-menu-container" className="relative">
            <button 
              id="kebab-menu-button"
              onClick={() => setKebabOpen(!kebabOpen)}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200 bg-white"
              title="Estrategias de Comprensión"
            >
              <MoreVertical size={18} />
            </button>

            {kebabOpen && (
              <div 
                id="kebab-dropdown-menu"
                className="absolute right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl w-64 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-3.5 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Habilitar Estrategias</p>
                </div>

                <button 
                  onClick={() => {
                    setEnabledStrategies({
                      highlight: false,
                      annotation: false,
                      prediction: false,
                      report: false
                    });
                    setKebabOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${(!enabledStrategies.highlight && !enabledStrategies.annotation && !enabledStrategies.prediction && !enabledStrategies.report) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <BookOpen size={14} className="text-slate-400 shrink-0" />
                  Lectura Limpia (Apagar todas)
                </button>

                <button 
                  onClick={() => {
                    setEnabledStrategies(prev => ({ ...prev, highlight: !prev.highlight }));
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${enabledStrategies.highlight ? 'bg-slate-50 font-semibold text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <PenTool size={14} className="text-yellow-500 shrink-0" />
                    <span>Subrayado de Colores</span>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${enabledStrategies.highlight ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {enabledStrategies.highlight && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setEnabledStrategies(prev => ({ ...prev, annotation: !prev.annotation }));
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${enabledStrategies.annotation ? 'bg-slate-50 font-semibold text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={14} className="text-indigo-500 shrink-0" />
                    <span>Anotaciones al Margen</span>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${enabledStrategies.annotation ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {enabledStrategies.annotation && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setEnabledStrategies(prev => ({ ...prev, prediction: !prev.prediction }));
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${enabledStrategies.prediction ? 'bg-slate-50 font-semibold text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle size={14} className="text-orange-500 shrink-0" />
                    <span>Predicciones Lectoras</span>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${enabledStrategies.prediction ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {enabledStrategies.prediction && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setEnabledStrategies(prev => ({ ...prev, report: !prev.report }));
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${enabledStrategies.report ? 'bg-slate-50 font-semibold text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={14} className="text-indigo-500 shrink-0" />
                    <span>Informe y Exportación</span>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${enabledStrategies.report ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {enabledStrategies.report && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>

                <div className="px-3.5 py-1.5 border-t border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Edición de Texto</p>
                </div>

                <button 
                  onClick={() => { setIsEditingContent(true); setKebabOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 text-slate-600 font-medium"
                >
                  <Edit2 size={14} className="text-indigo-600 shrink-0" />
                  Corregir texto manualmente
                </button>

                <button 
                  onClick={() => {
                    setKebabOpen(false);
                    if (window.confirm("¿Deseas optimizar automáticamente la legibilidad de este documento con Inteligencia Artificial? Esto corregirá saltos de línea innecesarios, palabras unidas o errores de formato del PDF.")) {
                      handleOptimizeWithAI(document.content);
                    }
                  }}
                  disabled={isOptimizingWithAI || !document.content.trim()}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer hover:bg-indigo-50 text-indigo-700 font-bold disabled:opacity-50"
                >
                  {isOptimizingWithAI ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Optimizando con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-indigo-600 shrink-0 animate-pulse" />
                      <span>Optimizar legibilidad con IA ✨</span>
                    </>
                  )}
                </button>

                <div className="px-3.5 py-1.5 border-t border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Imprimir / PDF</p>
                </div>

                <button 
                  onClick={() => { setShowPrintOptionsModal(true); setKebabOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 text-slate-600 font-medium"
                >
                  <Printer size={14} className="text-indigo-600 shrink-0" />
                  Imprimir con estrategias activas
                </button>

                <button 
                  onClick={() => { handlePrintDocument(false); setKebabOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 text-slate-600 font-medium"
                >
                  <Printer size={14} className="text-slate-400 shrink-0" />
                  Imprimir con estrategias inactivas
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* DYNAMIC COMPLEMENTS BAR OVER READING AREA */}

      {/* 1. COMPLEMENT: Color-Coded Highlighting (El Lápiz con colores elegibles y etiquetas) */}
      {enabledStrategies.highlight && (
        <div id="complement-highlight-pencil" className="px-6 py-4 border-b border-indigo-100/50 bg-indigo-50/30 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-250">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-yellow-100 text-yellow-700 rounded-lg">
              <PenTool size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight">Estrategia: Subrayado por Código de Colores</h3>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Etiqueta cada color según tu metodología. Selecciona texto y haz clic en el color para subrayar.</p>
            </div>
          </div>

          {/* Color desk palette (Pencil colors + Inputs to label) */}
          <div className="flex flex-wrap gap-2.5 pt-1 items-center">
            {visibleColors.map((color) => {
              const style = colorClasses[color];
              return (
                <div 
                  key={color}
                  className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/25 transition-all w-full sm:w-[220px]"
                >
                  {/* Dynamic Color circle acting as the pencil trigger */}
                  <button
                    onClick={() => {
                      if (!colorLabels[color]?.trim()) {
                        alert('Este color no está activo porque no tiene una etiqueta escrita.');
                        return;
                      }
                      handlePaletteHighlight(color);
                    }}
                    className={`w-5.5 h-5.5 rounded-full border border-black/10 shrink-0 transition-all duration-200 shadow-xs relative flex items-center justify-center cursor-pointer ${
                      !colorLabels[color]?.trim() 
                        ? 'opacity-30 cursor-not-allowed scale-90 hover:scale-90' 
                        : 'hover:scale-110 active:scale-95'
                    }`}
                    style={{ backgroundColor: style.hex }}
                    title={
                      colorLabels[color]?.trim() 
                        ? `Haga clic para subrayar texto como: ${colorLabels[color]}`
                        : 'Color inactivo (escribe una etiqueta a la derecha para activarlo)'
                    }
                  >
                    <PenTool size={10} className="text-slate-900 opacity-60" />
                  </button>

                  {/* Input to tag what the color represents */}
                  <input 
                    type="text"
                    value={colorLabels[color]}
                    onChange={(e) => handleColorLabelChange(color, e.target.value)}
                    className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none w-full border-b border-transparent hover:border-slate-200 focus:border-indigo-500"
                    placeholder="Etiqueta..."
                  />

                  {/* Remove color button if more than 1 color is active */}
                  {visibleColors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(color)}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                      title="Quitar color"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* "+ Agregar Color" button */}
            {visibleColors.length < 5 && (
              <button
                type="button"
                onClick={handleAddColor}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                <Plus size={14} className="shrink-0" />
                <span>Agregar Color</span>
              </button>
            )}
          </div>

          {/* Current Selection Assistive Banner */}
          {selectedText.trim() ? (
            <div className="text-[10px] bg-white px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center justify-between animate-pulse">
              <span className="text-indigo-800 font-medium">
                Listo para subrayar: <span className="italic font-bold">"{selectedText.substring(0, 55)}{selectedText.length > 55 ? '...' : ''}"</span>
              </span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">Haz clic en un color de lápiz arriba ☝️</span>
            </div>
          ) : (
            <div className="text-[9px] text-slate-400 italic">
              💡 Tip: Resalta una sección con el ratón abajo para que puedas hacer clic en los lápices de colores y etiquetarlo.
            </div>
          )}
        </div>
      )}

      {/* 2. COMPLEMENT: Annotation Margin status assist */}
      {enabledStrategies.annotation && (
        <div id="complement-annotation-banner" className="px-6 py-2 border-b border-indigo-100 bg-indigo-50/20 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <p className="flex items-center gap-1">
            <Info size={12} className="text-indigo-500 shrink-0" />
            <span>Selecciona un texto del lector para comentar, o <strong className="text-indigo-700">arrastra el pin de la derecha 📍</strong> sobre el documento:</span>
          </p>
          <div className="flex items-center gap-3">
            {/* Draggable Pin Source */}
            <div 
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "annotation-pin");
                e.dataTransfer.effectAllowed = "move";
              }}
              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md cursor-grab active:cursor-grabbing select-none animate-bounce hover:scale-105 transition-all"
              title="Arrastra este pin y suéltalo sobre la página para comentar en ese punto"
            >
              <MessageSquare size={10} strokeWidth={3} />
              <span>📍 Pin de Nota</span>
            </div>
            {selectedText.trim() && (
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                Selección activa lista ✔
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. COMPLEMENT: Predictions Widget */}
      {enabledStrategies.prediction && (
        <div id="complement-predictions" className="px-6 py-4 border-b border-orange-100/60 bg-orange-50/20 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-250">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg">
                <HelpCircle size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 tracking-tight">Estrategia: Predicciones de Comprensión</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Entrena tu lectura anticipativa. Predice qué dirá el texto antes de leerlo.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePredictionSubmit} className="flex gap-2">
            <input
              type="text"
              value={predictionInput}
              onChange={(e) => setPredictionInput(e.target.value)}
              placeholder="Ej: El autor detallará un experimento de laboratorio para fundamentar la teoría..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
            <button 
              type="submit"
              disabled={!predictionInput.trim()}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
            >
              Registrar Predicción
            </button>
          </form>
        </div>
      )}

      {/* 4. COMPLEMENT: Reports & Academic Exports */}
      {enabledStrategies.report && (
        <div id="complement-reports-panel" className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/20 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-250">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Award size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight">Exportación de Apuntes e Informes Académicos</h3>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Saca provecho de tus horas de estudio. Genera recursos portables para tu repaso o entrega.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Printable HTML */}
            <button
              onClick={handleExportHTMLReport}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <Printer size={14} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-900 leading-tight">Informe Imprimible</h4>
                  <p className="text-[9px] text-slate-400 leading-none mt-0.5">HTML académico estético</p>
                </div>
              </div>
              <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Markdown */}
            <button
              onClick={handleExportMarkdown}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                  <Tag size={14} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-900 leading-tight">Apuntes Markdown</h4>
                  <p className="text-[9px] text-slate-400 leading-none mt-0.5">Para Obsidian o Notion</p>
                </div>
              </div>
              <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* JSON DB Backup */}
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                  <Download size={14} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-900 leading-tight">Carga JSON Completa</h4>
                  <p className="text-[9px] text-slate-400 leading-none mt-0.5">Respaldo portable de base de datos</p>
                </div>
              </div>
              <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* AI Teacher Evaluation Section */}
            <button
              onClick={onGenerateAIReport}
              className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-850 hover:from-indigo-850 hover:to-indigo-800 text-white transition-all text-left cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 text-yellow-300 rounded-lg shrink-0 animate-pulse">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">Compilar con IA</h4>
                  <p className="text-[9px] text-indigo-200 leading-none mt-0.5">Informe Pedagógico Gemini</p>
                </div>
              </div>
              <ChevronRight size={12} className="text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}


      {/* MAIN VIEWPORT SPLIT PANEL: Allows "comentar al costado" margin notes column layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left pane: Reading Canvas */}
        <div 
          ref={viewerRef}
          onMouseUp={handleMouseUp}
          onClick={handleViewerClick}
          onMouseOver={handleTextMouseOver}
          onMouseOut={handleTextMouseOut}
          className="flex-1 overflow-y-auto px-8 py-6 relative select-text"
          style={{ minHeight: '350px' }}
        >
          {document.extractionFailed ? (
            showPageRangeModal ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-lg mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
                <Compass size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-2">Cargar Documento Multivista</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed mb-6">
                Este archivo tiene <strong className="text-slate-700">{document.pages?.length}</strong> páginas en su biblioteca. ¿Qué páginas deseas estudiar en esta sesión?
              </p>

              <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const indices = Array.from({ length: document.pages?.length || 1 }, (_, i) => i);
                      setAllowedPages(indices);
                      setCurrentPageIndex(0);
                      setShowPageRangeModal(false);
                    }}
                    className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Estudiar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = Math.max(1, rangeStartPage) - 1;
                      const end = Math.min(document.pages?.length || 1, rangeEndPage) - 1;
                      const indices: number[] = [];
                      for (let i = start; i <= end; i++) indices.push(i);
                      setAllowedPages(indices);
                      setCurrentPageIndex(start);
                      setShowPageRangeModal(false);
                    }}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Estudiar Rango
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 flex flex-col space-y-1 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Página Inicial</span>
                    <input
                      type="number"
                      min={1}
                      max={document.pages?.length || 1}
                      value={rangeStartPage}
                      onChange={(e) => setRangeStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex-1 flex flex-col space-y-1 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Página Final</span>
                    <input
                      type="number"
                      min={rangeStartPage}
                      max={document.pages?.length || 1}
                      value={rangeEndPage}
                      onChange={(e) => setRangeEndPage(Math.min(document.pages?.length || 1, Math.max(rangeStartPage, parseInt(e.target.value) || rangeStartPage)))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Visual Image Workspace */
            <div className="flex flex-col items-center space-y-4 max-w-full w-full">
              {/* Pagination Controller */}
              {document.pages && document.pages.length > 1 && allowedPages && (
                <div className="flex items-center justify-between bg-white border border-slate-100 shadow-sm px-5 py-2.5 rounded-2xl w-full max-w-3xl">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPageIndex === allowedPages[0]}
                    className="p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold text-slate-600"
                  >
                    <ChevronLeft size={15} />
                    <span>Anterior</span>
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Progreso de Estudio</span>
                    <span className="text-xs font-extrabold text-indigo-600">
                      Pág. {currentPageIndex + 1} de {document.pages.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPageIndex === allowedPages[allowedPages.length - 1]}
                    className="p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold text-slate-600"
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Toast Badge feedback */}
              {showSaveToast && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50 animate-in fade-in duration-200">
                  <span className="text-green-400">✓</span>
                  <span>Progreso de página guardado de forma segura</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between w-full max-w-3xl bg-slate-50 border border-slate-100 p-3 rounded-2xl gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg"><Sparkles size={14} /></span>
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800">Modo Pantalla Interactiva</h3>
                    <p className="text-[10px] text-slate-400">Las estrategias se aplican directamente sobre la imagen. Haz clic o arrastra para usar la herramienta activa.</p>
                  </div>
                </div>

                {document.hasPdfRaw && (
                  <div className="flex items-center bg-slate-200/70 p-1 rounded-xl shrink-0 border border-slate-300/40">
                    <button
                      type="button"
                      onClick={() => setPdfSelectionMode('text')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${pdfSelectionMode === 'text' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      Seleccionar Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfSelectionMode('box')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${pdfSelectionMode === 'box' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      Dibujar Recuadro
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-200/70 p-1 rounded-xl shrink-0 border border-slate-300/40 select-none">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1.5 rounded-lg hover:bg-slate-300/60 text-slate-700 cursor-pointer transition-all active:scale-95"
                    title="Alejar Zoom"
                  >
                    <ZoomOut size={12} strokeWidth={2.5} />
                  </button>
                  <span className="text-[10px] font-extrabold text-slate-700 px-1.5 min-w-[36px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                    className="p-1.5 rounded-lg hover:bg-slate-300/60 text-slate-700 cursor-pointer transition-all active:scale-95"
                    title="Acercar Zoom"
                  >
                    <ZoomIn size={12} strokeWidth={2.5} />
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-1.5 py-0.5 ml-1 rounded-md bg-slate-300/50 hover:bg-slate-300 text-[9px] font-bold text-slate-600 hover:text-slate-800 cursor-pointer transition-all"
                    >
                      Restaurar
                    </button>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={handleMergeAndCompileVisualDoc}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Award size={13} />
                  <span>Unir Capas y Guardar Copia</span>
                </button>
              </div>

              {/* Outer Scrollable Container for Zoom support */}
              <div className="w-full max-w-3xl overflow-auto bg-slate-100/40 border border-slate-200/80 rounded-2xl p-2.5 flex justify-center items-start min-h-[450px] max-h-[85vh] shadow-inner">
                {/* The "Pantalla" with relative aspect ratio, perfect layout */}
                <div 
                  className={`relative border border-slate-200 bg-white rounded-xl shadow-xl select-text cursor-crosshair group shrink-0 transition-all duration-300 ${
                    isDraggingOverPage ? 'ring-4 ring-orange-500/80 shadow-2xl scale-[1.01]' : ''
                  }`} 
                  style={{ 
                    aspectRatio: '8.5 / 11',
                    width: `${zoomLevel * 100}%`,
                    maxWidth: zoomLevel === 1 ? '100%' : 'none'
                  }}
                  onMouseDown={handleImageMouseDown}
                  onMouseMove={handleImageMouseMove}
                  onMouseUp={handleImageMouseUp}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingOverPage(true);
                  }}
                  onDragLeave={() => {
                    setIsDraggingOverPage(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOverPage(false);
                    const isPin = e.dataTransfer.getData("text/plain") === "annotation-pin";
                    if (!isPin) return;

                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;

                    // Setup annotation coordinate states
                    setPdfSelectionCoords({
                      x: x - 1.5,
                      y: y - 1.5,
                      w: 3,
                      h: 3,
                      pageIndex: currentPageIndex
                    });
                    setSelectedText(""); // Reset text selection
                    setMarginCommentInput("");
                    setShowMarginForm(true);
                    
                    // Focus sidebar comment textarea
                    setTimeout(() => {
                      marginCommentTextareaRef.current?.focus();
                    }, 150);
                  }}
                >
                  {/* Drag and Drop Over indicator overlay */}
                  {isDraggingOverPage && (
                    <div className="absolute inset-0 bg-orange-500/10 border-4 border-dashed border-orange-500 rounded-xl pointer-events-none z-50 flex items-center justify-center">
                      <div className="bg-white/95 text-orange-700 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-orange-100">
                        <MessageSquare className="animate-bounce text-orange-500" size={16} />
                        <span>Suelta el Pin aquí para comentar este punto</span>
                      </div>
                    </div>
                  )}
                {/* Background rendering: Live Canvas or Pre-rendered Page Image */}
                {document.hasPdfRaw ? (
                  <>
                    <canvas 
                      ref={canvasRef} 
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                    />
                    <div 
                      ref={textLayerRef} 
                      className={`textLayer ${pdfSelectionMode === 'box' || (!enabledStrategies.highlight && !enabledStrategies.annotation) ? 'pointer-events-none select-none' : 'pointer-events-auto'}`} 
                      onMouseUp={handleTextLayerMouseUp}
                    />
                  </>
                ) : (
                  <img 
                    src={resolvedPageUrls[currentPageIndex] || getVisualDocumentBg(document)} 
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" 
                    alt="Lectura Visual"
                  />
                )}

                {/* Highlights Overlay (Filtered by currentPageIndex) */}
                {highlights.filter(h => h.documentId === document.id && h.x !== undefined && (h.pageIndex === currentPageIndex || (currentPageIndex === 0 && h.pageIndex === undefined))).map(hl => (
                  <VisualHighlightMarker
                    key={hl.id}
                    hl={hl}
                    selectedHighlight={selectedHighlight}
                    onSelectHighlight={onSelectHighlight}
                    onDeleteHighlight={onDeleteHighlight}
                    editingHighlightColorId={editingHighlightColorId}
                    setEditingHighlightColorId={setEditingHighlightColorId}
                    colorClasses={colorClasses}
                    colorLabels={colorLabels}
                    onUpdateHighlightColor={onUpdateHighlightColor}
                  />
                ))}

                {/* Annotation Pins (Filtered by currentPageIndex) */}
                {annotations.filter(a => a.documentId === document.id && a.x !== undefined && (a.pageIndex === currentPageIndex || (currentPageIndex === 0 && a.pageIndex === undefined))).map((ann, idx) => (
                  <AnnotationPinMarker
                    key={ann.id}
                    ann={ann}
                    idx={idx}
                    highlights={highlights}
                    selectedHighlight={selectedHighlight}
                    onSelectHighlight={onSelectHighlight}
                    onDeleteHighlight={onDeleteHighlight}
                    onUpdateCoords={onUpdateAnnotationCoords || (() => {})}
                  />
                ))}

                {/* Prediction Pins (Filtered by currentPageIndex) */}
                {predictions.filter(p => p.documentId === document.id && p.x !== undefined && (p.pageIndex === currentPageIndex || (currentPageIndex === 0 && p.pageIndex === undefined))).map((pred, idx) => (
                  <div
                    key={pred.id}
                    className="absolute group z-10"
                    style={{
                      left: `${pred.x}%`,
                      top: `${pred.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110 relative ${
                      pred.status === 'correct' ? 'bg-green-600 hover:bg-green-700' :
                      pred.status === 'incorrect' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}>
                      <Sparkles size={14} />
                      <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-30 pointer-events-none ${
                        pred.status === 'correct' ? 'border-green-400' :
                        pred.status === 'incorrect' ? 'border-red-400' : 'border-indigo-400'
                      }`} />
                    </div>

                    {/* Popover */}
                    <div className="absolute left-1/2 bottom-10 -translate-x-1/2 w-60 bg-slate-950/95 backdrop-blur-sm text-white text-[11px] p-3 rounded-2xl shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-20 flex flex-col space-y-1.5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="font-extrabold text-[9px] tracking-wider text-indigo-400 uppercase flex items-center gap-1">🔮 Predicción</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeletePrediction(pred.id); }}
                          className="text-white/60 hover:text-red-400 font-bold text-[9px] cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                      <p className="leading-normal text-white/95 font-medium break-words text-left italic">"{pred.text}"</p>
                      
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                        <span className="text-[8px] text-white/40 font-bold">¿FUE CORRECTA?</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onUpdatePredictionStatus(pred.id, 'correct'); }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors ${pred.status === 'correct' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/75 hover:bg-green-500/25'}`}
                          >
                            ✓ Sí
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onUpdatePredictionStatus(pred.id, 'incorrect'); }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors ${pred.status === 'incorrect' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/75 hover:bg-red-500/25'}`}
                          >
                            ✗ No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live drag selection box preview */}
                {isDragging && dragStart && dragCurrent && (
                  <div
                    className="absolute border-2 border-dashed border-indigo-500 bg-indigo-200/30 pointer-events-none"
                    style={{
                      left: `${Math.min(dragStart.x, dragCurrent.x)}%`,
                      top: `${Math.min(dragStart.y, dragCurrent.y)}%`,
                      width: `${Math.abs(dragStart.x - dragCurrent.x)}%`,
                      height: `${Math.abs(dragStart.y - dragCurrent.y)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          )) : (
            /* Main rendered text for standard text documents */
            <div 
              className="document-content-rendered prose max-w-none"
              dangerouslySetInnerHTML={{ __html: renderDocumentWithHighlights() }}
            />
          )}

          {/* OVERLAY SCREEN ("PANTALLA") ON MANUAL CORRECTION */}
          {isEditingContent && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 z-30 animate-in fade-in duration-300 select-none">
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-2xl p-6 md:p-8 max-w-lg w-full flex flex-col space-y-4 animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl shrink-0 animate-pulse">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                      Corrección manual de lectura
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Corrige o actualiza el texto de tu documento a continuación.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Para que puedas aplicar las estrategias de comprensión lectora (<strong>subrayado con colores</strong>, <strong>anotaciones al margen</strong> y <strong>predicciones lectoras</strong>), por favor ingresa o edita el contenido de esta lectura:
                </p>

                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Pega o escribe el texto de tu documento aquí..."
                  className="w-full h-44 text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans resize-none text-slate-800"
                />

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingContent(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isOptimizingWithAI || !manualText.trim()}
                      onClick={() => handleOptimizeWithAI(manualText)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      {isOptimizingWithAI ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="animate-pulse" />
                          <span>Optimizar con IA ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={!manualText.trim() || isOptimizingWithAI}
                    onClick={() => {
                      if (onUpdateDocumentContent && manualText.trim()) {
                        onUpdateDocumentContent(document.id, manualText.trim());
                      }
                      setIsEditingContent(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TEXT HIGHLIGHTS FLOATING HOVER TOOLTIP */}
          {textTooltip && (
            <div 
              className="absolute bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xl z-50 border border-slate-700 max-w-[150px] truncate animate-in fade-in slide-in-from-bottom-1 duration-200 pointer-events-none select-none text-center"
              style={{
                left: `${textTooltip.x}px`,
                top: `${textTooltip.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {textTooltip.label}
            </div>
          )}

          {/* FLOATING TEXT SELECTION PALETTE */}
          {floatingMenu && floatingMenu.visible && (
            <div 
              id="floating-highlight-menu"
              className="absolute z-40 bg-slate-900 text-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2 border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                left: `${floatingMenu.x}px`, 
                top: `${floatingMenu.y}px`,
                transform: 'translateX(-50%)' 
              }}
              onMouseDown={(e) => e.stopPropagation()} // Prevent closing
            >
              {floatingMenuMode === 'options' && (
                <div className="flex items-center gap-1.5 py-0.5 select-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1.5">Estrategias:</span>
                  {enabledStrategies.highlight && (
                    <button
                      onClick={() => setFloatingMenuMode('highlight')}
                      className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                      title="Subrayar texto"
                    >
                      <PenTool size={11} className="text-yellow-400 shrink-0" />
                    </button>
                  )}
                  {enabledStrategies.annotation && (
                    <button
                      onClick={() => {
                        setShowMarginForm(true);
                        setMarginCommentInput('');
                        setFloatingMenu(null);
                        setTimeout(() => marginCommentTextareaRef.current?.focus(), 150);
                      }}
                      className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                      title="Agregar nota al margen"
                    >
                      <MessageSquare size={11} className="text-indigo-400 shrink-0" />
                    </button>
                  )}
                  {enabledStrategies.prediction && (
                    <button
                      onClick={() => {
                        setShowPredictionForm(true);
                        setPredictionSelectionInput('');
                        setFloatingMenu(null);
                      }}
                      className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                      title="Proponer predicción"
                    >
                      <HelpCircle size={11} className="text-orange-400 shrink-0" />
                    </button>
                  )}
                </div>
              )}

              {floatingMenuMode === 'highlight' && (
                <>
                  <span className="text-xs font-semibold text-slate-400 border-r border-slate-700 pr-2 mr-1 select-none flex items-center gap-1.5">
                    {((enabledStrategies.highlight ? 1 : 0) + (enabledStrategies.annotation ? 1 : 0) + (enabledStrategies.prediction ? 1 : 0)) > 1 && (
                      <button 
                        onClick={() => setFloatingMenuMode('options')}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                        title="Volver"
                      >
                        <ArrowLeft size={11} />
                      </button>
                    )}
                    <span>Subrayar:</span>
                  </span>
                  
                  {visibleColors.map(color => {
                    const isActive = !!colorLabels[color]?.trim();
                    return (
                      <button 
                        key={color}
                        id={`btn-highlight-${color}`}
                        disabled={!isActive}
                        onClick={() => handleHighlightAction(color, colorLabels[color] || 'Subrayado')}
                        className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                          isActive 
                            ? 'border-white hover:scale-110 cursor-pointer opacity-100' 
                            : 'border-slate-600 opacity-20 cursor-not-allowed hover:scale-100'
                        }`}
                        style={{ backgroundColor: colorClasses[color].hex }}
                        title={
                          isActive 
                            ? (colorLabels[color] || 'Etiqueta el color') 
                            : 'Color inactivo (sin etiqueta escrita)'
                        }
                      />
                    );
                  })}

                  {/* Divider and Delete Button */}
                  <div className="w-[1px] h-5 bg-slate-700 mx-1 shrink-0" />
                  
                  <button
                    onClick={handleDeleteHighlightFromSelection}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer transition-colors border border-red-500/30 shrink-0"
                    title="Eliminar subrayado"
                  >
                    <Trash2 size={11} className="shrink-0" />
                    <span>Eliminar subrayado</span>
                  </button>
                </>
              )}

              {floatingMenuMode === 'annotation' && (
                <div className="flex items-center gap-1.5 py-0.5">
                  {((enabledStrategies.highlight ? 1 : 0) + (enabledStrategies.annotation ? 1 : 0) + (enabledStrategies.prediction ? 1 : 0)) > 1 && (
                    <button 
                      onClick={() => setFloatingMenuMode('options')}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                      title="Volver"
                    >
                      <ArrowLeft size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMarginForm(true);
                      setMarginCommentInput('');
                      setFloatingMenu(null);
                      setTimeout(() => marginCommentTextareaRef.current?.focus(), 150);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <MessageSquare size={12} />
                    💬 Anotar al Margen
                  </button>
                </div>
              )}

              {floatingMenuMode === 'prediction' && (
                <div className="flex items-center gap-1.5 py-0.5">
                  {((enabledStrategies.highlight ? 1 : 0) + (enabledStrategies.annotation ? 1 : 0) + (enabledStrategies.prediction ? 1 : 0)) > 1 && (
                    <button 
                      onClick={() => setFloatingMenuMode('options')}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                      title="Volver"
                    >
                      <ArrowLeft size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowPredictionForm(true);
                      setPredictionSelectionInput('');
                      setFloatingMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <HelpCircle size={12} />
                    🔮 Proponer Predicción
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR COMPLEMENTS: Stack active panes */}
        {(enabledStrategies.annotation || enabledStrategies.prediction) && (
          <div 
            id="strategies-sidebar"
            className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/50 flex flex-col shrink-0 overflow-y-auto divide-y divide-slate-150"
          >
            {/* 2. COMPLEMENT VIEWPORT SIDEBAR: "Anotaciones al margen del texto / Comentar al costado" */}
            {enabledStrategies.annotation && (
              <div 
                id="margin-notes-pane"
                className="p-4 flex flex-col shrink-0"
              >
                {/* Compose Annotation form */}
                {showMarginForm && (
                  <form 
                    onSubmit={handleSaveMarginAnnotationSubmit}
                    className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 mb-4 animate-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Nueva Nota al Margen</span>
                      <button 
                        type="button"
                        onClick={() => setShowMarginForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 italic mb-2 line-clamp-3 bg-white/50 p-1.5 rounded border border-slate-100 font-medium">
                      "{selectedText}"
                    </p>

                    <textarea
                      ref={marginCommentTextareaRef}
                      value={marginCommentInput}
                      onChange={(e) => setMarginCommentInput(e.target.value)}
                      placeholder="Escribe tu reflexión, duda o aclaratoria académica sobre este fragmento..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none h-20"
                      required
                    />

                    <div className="flex justify-end gap-1.5 mt-2">
                      <button 
                        type="button"
                        onClick={() => setShowMarginForm(false)}
                        className="px-2.5 py-1 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check size={10} />
                        Guardar al Margen
                      </button>
                    </div>
                  </form>
                )}

                {/* Draggable Pin Palette inside Sidebar */}
                <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3 mb-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-orange-800 font-bold mb-1.5 flex items-center gap-1 justify-center">
                    <MessageSquare size={12} className="text-orange-600" />
                    ¿Quieres dejar una nota en la página?
                  </p>
                  <div 
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", "annotation-pin");
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105"
                    title="Arrastra este pin y suéltalo sobre la página del documento para comentar"
                  >
                    <MessageSquare size={12} strokeWidth={3} />
                    <span>Arrastrar Pin 📍</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2">Arrastra el pin al documento o selecciona texto para comentarlo.</p>
                </div>

                {/* List of current annotations */}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notas del Margen Académico ({docAnnotations.length})</h4>
                  </div>

                  <div className="space-y-2 flex-1">
                    {docAnnotations.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-white/50 flex flex-col items-center justify-center">
                        <MessageSquare size={20} className="text-slate-300 mb-1.5" />
                        <p className="text-[11px] text-slate-400 font-medium">No has comentado al costado.</p>
                        <p className="text-[9px] text-slate-300 mt-0.5">Selecciona texto y pulsa "Crear Nota al Margen" arriba.</p>
                      </div>
                    ) : (
                      docAnnotations.map(ann => {
                        const linkedHighlight = docHighlights.find(h => h.id === ann.highlightId);
                        return (
                          <div 
                            key={ann.id}
                            onClick={() => {
                              if (linkedHighlight) {
                                onSelectHighlight(linkedHighlight);
                                const pageToGo = linkedHighlight.pageIndex ?? ann.pageIndex;
                                if (pageToGo !== undefined && allowedPages?.includes(pageToGo)) {
                                  setCurrentPageIndex(pageToGo);
                                }
                              }
                            }}
                            className={`p-3 rounded-xl border border-slate-100 bg-white shadow-xs text-left cursor-pointer hover:border-indigo-200 transition-all ${selectedHighlight?.id === ann.highlightId ? 'ring-2 ring-indigo-500 shadow-sm' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                Nota al Margen
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (linkedHighlight) {
                                    onDeleteHighlight(linkedHighlight.id);
                                  }
                                }}
                                className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                                title="Eliminar Comentario"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            {linkedHighlight && (
                              <p className="text-[10px] text-slate-400 italic line-clamp-2 border-l border-indigo-200 pl-1.5 mb-1.5">
                                "{linkedHighlight.text}"
                              </p>
                            )}

                            <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {ann.comment}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. COMPLEMENT VIEWPORT SIDEBAR: Predictions tracking panel */}
            {enabledStrategies.prediction && (
              <div 
                id="predictions-pane"
                className="p-4 flex flex-col shrink-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tus Predicciones ({docPredictions.length})</h4>
                </div>

                {/* Selection Prediction Form */}
                {showPredictionForm && (
                  <form 
                    onSubmit={handleSavePredictionFromSelectionSubmit}
                    className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 animate-in zoom-in-95 duration-150 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Nueva Predicción</span>
                      <button 
                        type="button"
                        onClick={() => setShowPredictionForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 italic mb-2.5 line-clamp-3 bg-white/70 p-2 rounded border border-slate-150 font-medium">
                      "{selectedText}"
                    </p>

                    <textarea
                      value={predictionSelectionInput}
                      onChange={(e) => setPredictionSelectionInput(e.target.value)}
                      placeholder="Escribe aquí tu hipótesis o predicción sobre qué pasará después de este fragmento..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none h-20 leading-relaxed font-medium"
                      required
                      autoFocus
                    />

                    <div className="flex justify-end gap-1.5 mt-2.5">
                      <button 
                        type="button"
                        onClick={() => setShowPredictionForm(false)}
                        className="px-2.5 py-1 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-md shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check size={10} />
                        Guardar
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 flex-1">
                  {docPredictions.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-white/50 flex flex-col items-center justify-center">
                      <Compass size={20} className="text-slate-300 mb-1.5" />
                      <p className="text-[11px] text-slate-400 font-medium">Sin predicciones activas.</p>
                      <p className="text-[9px] text-slate-300 mt-0.5">Usa la caja de predicción arriba o selecciona un texto para proponer una predicción específica.</p>
                    </div>
                  ) : (
                    docPredictions.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          if (p.pageIndex !== undefined && allowedPages?.includes(p.pageIndex)) {
                            setCurrentPageIndex(p.pageIndex);
                          }
                        }}
                        className={`p-3 rounded-xl border border-slate-100 bg-white shadow-xs text-left cursor-pointer hover:border-indigo-200 transition-all ${
                          p.status === 'correct' ? 'border-emerald-200 bg-emerald-50/20' :
                          p.status === 'incorrect' ? 'border-rose-200 bg-rose-50/20' :
                          ''
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button 
                            onClick={() => onDeletePrediction(p.id)}
                            className="text-slate-300 hover:text-red-500 rounded p-0.5 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed mb-2.5">
                          {p.text}
                        </p>

                        <div className="flex gap-1">
                          {/* Check Correct */}
                          <button 
                            onClick={() => onUpdatePredictionStatus(p.id, p.status === 'correct' ? 'pending' : 'correct')}
                            className={`flex-1 flex items-center justify-center gap-0.5 py-1 rounded text-[9px] font-bold border cursor-pointer transition-colors ${
                              p.status === 'correct' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                            }`}
                          >
                            <CheckCircle2 size={10} />
                            Acertada
                          </button>

                          {/* Check Incorrect */}
                          <button 
                            onClick={() => onUpdatePredictionStatus(p.id, p.status === 'incorrect' ? 'pending' : 'incorrect')}
                            className={`flex-1 flex items-center justify-center gap-0.5 py-1 rounded text-[9px] font-bold border cursor-pointer transition-colors ${
                              p.status === 'incorrect' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            }`}
                          >
                            <AlertTriangle size={10} />
                            Errada
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom instructional status bar */}
      <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400 select-none">
        <p className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
          <span>Sugerencia: Selecciona cualquier texto para desplegar las herramientas rápidas del visualizador.</span>
        </p>
        <span className="font-mono text-[10px] hidden md:inline">Sincronización Cloud Activa</span>
      </div>

      {/* PRINT OPTIONS CHECKLIST MODAL */}
      {showPrintOptionsModal && (
        <div id="print-options-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm md:text-base">Opciones de Impresión Activa</h3>
              </div>
              <button 
                onClick={() => setShowPrintOptionsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Selecciona las estrategias de comprensión lectora que deseas incluir en el informe impreso o PDF. Los comentarios y predicciones se diagramarán en una elegante columna lateral al costado del texto principal.
              </p>

              <div className="space-y-2.5">
                {/* 1. Highlights Option */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={printOptions.highlights}
                    onChange={(e) => setPrintOptions({ ...printOptions, highlights: e.target.checked })}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Subrayados y Códigos de Color</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Mantiene los resaltados coloreados de tus categorías activas sobre el texto principal.</p>
                  </div>
                </label>

                {/* 2. Annotations Option */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={printOptions.annotations}
                    onChange={(e) => setPrintOptions({ ...printOptions, annotations: e.target.checked })}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Anotaciones al Margen (Comentarios)</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Muestra tus comentarios críticos vinculados a los fragmentos del texto en la columna lateral.</p>
                  </div>
                </label>

                {/* 3. Predictions Option */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={printOptions.predictions}
                    onChange={(e) => setPrintOptions({ ...printOptions, predictions: e.target.checked })}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Predicciones de Comprensión</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Muestra tus hipótesis y su estado de comprobación (acertada, errada o pendiente) en la columna lateral.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrintOptionsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handlePrintDocument(true, printOptions);
                    setShowPrintOptionsModal(false);
                  }}
                  disabled={!printOptions.highlights && !printOptions.annotations && !printOptions.predictions}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  Confirmar e Imprimir
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
