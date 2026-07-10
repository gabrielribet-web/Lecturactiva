/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ReadingDocument, Highlight, Annotation, Prediction, HighlightColor } from './types';
import { SyncManager, ImageStore } from './utils/syncManager';
import DocumentViewer from './components/DocumentViewer';
import TeacherReport from './components/TeacherReport';
import { 
  BookOpen, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Plus, 
  FileUp, 
  RotateCcw, 
  Sparkles, 
  Check, 
  AlertTriangle,
  GraduationCap,
  ClipboardList,
  Edit3,
  ChevronRight,
  Trash2
} from 'lucide-react';

export default function App() {
  // Global States
  const [documents, setDocuments] = useState<ReadingDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ReadingDocument | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [studentName, setStudentName] = useState('Gabriel Ribet'); // Default name from metadata
  
  // UI Panels
  const [reportOpen, setReportOpen] = useState(false);
  const [activeReportData, setActiveReportData] = useState<{ summary: string; pedagogicalFeedback: string } | null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // New manual document form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocFormat, setNewDocFormat] = useState<'html' | 'markdown' | 'text'>('markdown');

  // Network / Sync Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // AI Loading & Results
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // File uploading/parsing status
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfUploadPending, setPdfUploadPending] = useState<{
    file: File;
    totalPages: number;
    arrayBuffer: ArrayBuffer;
  } | null>(null);
  const [pdfPageRangeMode, setPdfPageRangeMode] = useState<'all' | 'range'>('all');
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [pdfEndPage, setPdfEndPage] = useState<number>(1);

  // Deletion state
  const [deletingDoc, setDeletingDoc] = useState<ReadingDocument | null>(null);

  // 1. Load data on mount and subscribe to network events
  useEffect(() => {
    // Sync Manager initializes with default documents if local storage is blank
    const docs = SyncManager.getDocuments();
    setDocuments(docs);
    // Don't auto-select the first document to allow Landing Page to show first
    setSelectedDoc(null);

    setHighlights(SyncManager.getHighlights());
    setAnnotations(SyncManager.getAnnotations());
    setPredictions(SyncManager.getPredictions());
    setLastSync(SyncManager.getLastSyncTime());

    // Register offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerCloudSync(); // Auto sync on reconnection
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial background sync
    setTimeout(() => {
      triggerCloudSync();
    }, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Trigger Cloud Sync
  const triggerCloudSync = async () => {
    if (!navigator.onLine) {
      setSyncError('Sin conexión a Internet.');
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      // SyncManager syncs all collections of localStorage to server database
      const result = await SyncManager.syncWithCloud();
      if (result.success) {
        // Reload synced states back to component
        setDocuments(SyncManager.getDocuments());
        setHighlights(SyncManager.getHighlights());
        setAnnotations(SyncManager.getAnnotations());
        setPredictions(SyncManager.getPredictions());
        setLastSync(SyncManager.getLastSyncTime());
        
        // Update selected document reference to match synced content if needed
        if (selectedDoc) {
          const updated = SyncManager.getDocuments().find(d => d.id === selectedDoc.id);
          if (updated) setSelectedDoc(updated);
        }
      } else {
        setSyncError(result.error || 'Sincronización rechazada.');
      }
    } catch (err: any) {
      setSyncError('Error de red al sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  // 3. Document Handlers
  const handleSelectDocument = (doc: ReadingDocument) => {
    setSelectedDoc(doc);
    setSelectedHighlight(null);
    setAiResult(null);
    setActiveReportData(null);
  };

  const handleDeleteDocument = (docId: string) => {
    const updatedDocs = documents.filter(d => d.id !== docId);
    setDocuments(updatedDocs);
    SyncManager.saveDocuments(updatedDocs);

    // Track the deleted document ID for server-side sync
    SyncManager.addDeletedDocId(docId);

    // Clean up related highlights, annotations, and predictions locally
    const filteredHighlights = highlights.filter(h => h.documentId !== docId);
    const filteredAnnotations = annotations.filter(a => a.documentId !== docId);
    const filteredPredictions = predictions.filter(p => p.documentId !== docId);

    setHighlights(filteredHighlights);
    setAnnotations(filteredAnnotations);
    setPredictions(filteredPredictions);

    SyncManager.saveHighlights(filteredHighlights);
    SyncManager.saveAnnotations(filteredAnnotations);
    SyncManager.savePredictions(filteredPredictions);

    if (selectedDoc?.id === docId) {
      setSelectedDoc(null);
    }

    setDeletingDoc(null);

    // Synchronize the deletion with the cloud
    triggerCloudSync();
  };

  const handleUpdateDocumentContent = (id: string, newContent: string) => {
    const updatedDocs = documents.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          content: newContent,
          extractionFailed: false, // marked as successfully provided
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    });

    setDocuments(updatedDocs);
    SyncManager.saveDocuments(updatedDocs);

    if (selectedDoc?.id === id) {
      setSelectedDoc(prev => prev ? {
        ...prev,
        content: newContent,
        extractionFailed: false,
        updatedAt: new Date().toISOString()
      } : null);
    }

    triggerCloudSync();
  };

  const handleAddCompiledDocument = (title: string, imageUrl: string) => {
    const newDoc: ReadingDocument = {
      id: `doc-${Date.now()}`,
      title,
      content: "",
      format: 'text',
      imageCount: 1,
      hasImages: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true,
      extractionFailed: true,
      imageUrl
    };

    const updatedDocs = [newDoc, ...documents];
    setDocuments(updatedDocs);
    SyncManager.saveDocuments(updatedDocs);
    setSelectedDoc(newDoc);
    triggerCloudSync();
  };

  const loadPdfJS = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve((window as any).pdfjsLib);
      };
      script.onerror = () => reject(new Error("No se pudo cargar la librería PDF.js para renderizado visual"));
      document.head.appendChild(script);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    // Intercept PDF files to render them visually as images immediately, with no text extraction.
    if (extension === 'pdf') {
      setUploading(true);
      setUploadError(null);
      const pdfReader = new FileReader();
      pdfReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (!arrayBuffer) throw new Error("No se pudo leer el archivo PDF.");

          // Load PDF.js dynamically
          const pdfjs = await loadPdfJS();
          const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
          const pdfDoc = await loadingTask.promise;

          setPdfUploadPending({
            file,
            totalPages: pdfDoc.numPages,
            arrayBuffer
          });
          setPdfPageRangeMode('all');
          setPdfStartPage(1);
          setPdfEndPage(Math.min(pdfDoc.numPages, 10)); // Default to first 10 pages for optimal loading
        } catch (err: any) {
          console.error(err);
          setUploadError(`Error al procesar el PDF: ${err.message || err}`);
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      };
      pdfReader.readAsArrayBuffer(file);
      return;
    }

    const isBinaryFormat = ['docx', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '');

    const reader = new FileReader();

    if (isBinaryFormat) {
      setUploading(true);
      setUploadError(null);
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          if (!dataUrl) throw new Error("No se pudo leer el archivo.");

          const base64Data = dataUrl.split(',')[1];
          if (!base64Data) throw new Error("Datos de archivo dañados.");

          const response = await fetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, base64Data })
          });

          const result = await response.json();
          
          let content = "";
          let extractionFailed = false;

          if (!response.ok || !result.success) {
            extractionFailed = true;
          } else {
            content = result.text || "";
            extractionFailed = result.extractionFailed || false;
          }

          const format: 'html' | 'markdown' | 'text' = result.format || 'text';

          const newDoc: ReadingDocument = {
            id: `doc-${Date.now()}`,
            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            content,
            format,
            imageCount: ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '') ? 1 : 0,
            hasImages: ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isCustom: true,
            extractionFailed,
            imageUrl: result.imageUrl || undefined
          };

          const updatedDocs = [newDoc, ...documents];
          setDocuments(updatedDocs);
          SyncManager.saveDocuments(updatedDocs);
          setSelectedDoc(newDoc);

          if (extractionFailed) {
            if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) {
              setUploadError("Imagen cargada con éxito. Puedes aplicar las estrategias interactivas sobre esta imagen.");
            } else {
              setUploadError("No se pudo extraer texto. El archivo se ha cargado en formato visual para estudio con pantalla interactiva.");
            }
          } else {
            setUploadError(null);
          }

          // Trigger automatic sync
          triggerCloudSync();
        } catch (err: any) {
          console.error(err);
          // Fallback document even in hard network or parse errors!
          const newDoc: ReadingDocument = {
            id: `doc-${Date.now()}`,
            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            content: "",
            format: 'text',
            imageCount: 0,
            hasImages: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isCustom: true,
            extractionFailed: true
          };

          const updatedDocs = [newDoc, ...documents];
          setDocuments(updatedDocs);
          SyncManager.saveDocuments(updatedDocs);
          setSelectedDoc(newDoc);

          setUploadError("No se pudo procesar el archivo automáticamente. Se ha cargado en formato visual para estudio.");
          triggerCloudSync();
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } else {
      setUploadError(null);
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        let format: 'html' | 'markdown' | 'text' = 'text';
        if (extension === 'md' || extension === 'markdown') {
          format = 'markdown';
        } else if (extension === 'html' || extension === 'htm') {
          format = 'html';
        }

        // Check for inline images
        const hasImages = content.includes('<img') || content.includes('![');
        const imageCount = (content.match(/<img|!\[/g) || []).length;

        const newDoc: ReadingDocument = {
          id: `doc-${Date.now()}`,
          title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
          content,
          format,
          imageCount,
          hasImages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isCustom: true
        };

        const updatedDocs = [newDoc, ...documents];
        setDocuments(updatedDocs);
        SyncManager.saveDocuments(updatedDocs);
        setSelectedDoc(newDoc);
        
        // Clear input
        e.target.value = '';

        // Trigger automatic sync
        triggerCloudSync();
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmPdfImport = async () => {
    if (!pdfUploadPending) return;
    setUploading(true);
    setUploadError(null);
    const { file, totalPages, arrayBuffer } = pdfUploadPending;

    try {
      const pdfjs = await loadPdfJS();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
      const pdfDoc = await loadingTask.promise;

      const pageImages: HTMLCanvasElement[] = [];
      let totalHeight = 0;
      let maxWidth = 0;

      const start = pdfPageRangeMode === 'range' ? Math.max(1, pdfStartPage) : 1;
      const end = pdfPageRangeMode === 'range' ? Math.min(totalPages, pdfEndPage) : totalPages;

      if (start > end) {
        throw new Error("La página inicial no puede ser mayor que la página final.");
      }

      for (let i = start; i <= end; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.3 });
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = viewport.width;
        pageCanvas.height = viewport.height;
        const context = pageCanvas.getContext('2d');
        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          pageImages.push(pageCanvas);
          totalHeight += viewport.height;
          if (viewport.width > maxWidth) {
            maxWidth = viewport.width;
          }
        }
      }

      if (pageImages.length === 0) {
        throw new Error("No se pudieron renderizar las páginas del PDF.");
      }

      const pagesDataUrls = pageImages.map(canvas => canvas.toDataURL('image/png'));
      const newDocId = `doc-${Date.now()}`;

      // Convert original PDF to Base64 to store in IndexedDB
      // This is crucial for rendering the textLayer live!
      let pdfBase64 = '';
      try {
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        const chunk = 8192;
        for (let i = 0; i < len; i += chunk) {
          const subarray = bytes.subarray(i, i + chunk);
          binary += String.fromCharCode.apply(null, Array.from(subarray));
        }
        pdfBase64 = window.btoa(binary);
        await ImageStore.set(`pdf_raw_${newDocId}`, pdfBase64);
      } catch (e) {
        console.error("Could not store raw PDF in IndexedDB:", e);
      }

      const newDoc: ReadingDocument = {
        id: newDocId,
        title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        content: "",
        format: 'text',
        imageCount: pageImages.length,
        hasImages: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: true,
        extractionFailed: true, // Interactive Screen Mode enabled
        imageUrl: pagesDataUrls[0],
        pages: pagesDataUrls,
        hasPdfRaw: !!pdfBase64
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      SyncManager.saveDocuments(updatedDocs);
      setSelectedDoc(newDoc);
      setPdfUploadPending(null);
      setUploadError(null);
      triggerCloudSync();
    } catch (err: any) {
      console.error(err);
      setUploadError(`Error al procesar el rango de páginas: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddManualDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const hasImages = newDocContent.includes('<img') || newDocContent.includes('![');
    const imageCount = (newDocContent.match(/<img|!\[/g) || []).length;

    const newDoc: ReadingDocument = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      content: newDocContent.trim(),
      format: newDocFormat,
      imageCount,
      hasImages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true
    };

    const updatedDocs = [newDoc, ...documents];
    setDocuments(updatedDocs);
    SyncManager.saveDocuments(updatedDocs);
    setSelectedDoc(newDoc);
    
    // Reset Form & Close
    setNewDocTitle('');
    setNewDocContent('');
    setNewDocFormat('markdown');
    setShowAddDocModal(false);

    // Auto-sync
    triggerCloudSync();
  };

  const handleResetDatabase = () => {
    if (window.confirm('¿Estás seguro de restablecer el visualizador? Se borrarán tus subrayados, notas y documentos personalizados.')) {
      const resetDocs = SyncManager.resetToDefault();
      setDocuments(resetDocs);
      setHighlights([]);
      setAnnotations([]);
      setPredictions([]);
      setSelectedDoc(resetDocs[0]);
      setSelectedHighlight(null);
      setLastSync(null);
      setAiResult(null);
      setActiveReportData(null);
      triggerCloudSync();
    }
  };

  // 4. Reading Strategy Handlers
  const handleAddHighlight = (
    text: string, 
    color: HighlightColor, 
    category: string, 
    coords?: { x: number; y: number; w: number; h: number; pageIndex?: number }
  ): string => {
    if (!selectedDoc) return '';

    const newHighlight: Highlight = {
      id: `hl-${Date.now()}`,
      documentId: selectedDoc.id,
      text,
      color,
      category,
      createdAt: new Date().toISOString(),
      ...(coords || {})
    };

    const updatedHighlights = [...highlights, newHighlight];
    setHighlights(updatedHighlights);
    SyncManager.saveHighlights(updatedHighlights);
    setSelectedHighlight(newHighlight);

    // Trigger auto-sync in background
    triggerCloudSync();
    return newHighlight.id;
  };

  const handleDeleteHighlight = (id: string) => {
    const updatedHighlights = highlights.filter(h => h.id !== id);
    setHighlights(updatedHighlights);
    SyncManager.saveHighlights(updatedHighlights);

    // Also delete any associated annotations
    const updatedAnnotations = annotations.filter(a => a.highlightId !== id);
    setAnnotations(updatedAnnotations);
    SyncManager.saveAnnotations(updatedAnnotations);

    if (selectedHighlight?.id === id) {
      setSelectedHighlight(null);
    }

    triggerCloudSync();
  };

  const handleUpdateHighlightColor = (id: string, color: HighlightColor) => {
    const updatedHighlights = highlights.map(h => {
      if (h.id === id) {
        return { ...h, color };
      }
      return h;
    });
    setHighlights(updatedHighlights);
    SyncManager.saveHighlights(updatedHighlights);

    if (selectedHighlight?.id === id) {
      setSelectedHighlight({ ...selectedHighlight, color });
    }

    triggerCloudSync();
  };

  const handleAddAnnotation = (highlightId: string, comment: string, coords?: { x: number; y: number; pageIndex?: number }) => {
    if (!selectedDoc) return;

    // Check if annotation already exists for this highlight
    const existingIdx = annotations.findIndex(a => a.highlightId === highlightId);
    let updatedAnnotations = [...annotations];

    if (existingIdx > -1) {
      // Update
      updatedAnnotations[existingIdx] = {
        ...updatedAnnotations[existingIdx],
        comment,
        createdAt: new Date().toISOString(),
        ...(coords || {})
      };
    } else {
      // Create
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        documentId: selectedDoc.id,
        highlightId,
        comment,
        createdAt: new Date().toISOString(),
        ...(coords || {})
      };
      updatedAnnotations.push(newAnnotation);
    }

    setAnnotations(updatedAnnotations);
    SyncManager.saveAnnotations(updatedAnnotations);
    triggerCloudSync();
  };

  const handleUpdateAnnotationCoords = (annotationId: string, x: number, y: number) => {
    const targetAnn = annotations.find(ann => ann.id === annotationId);
    if (!targetAnn) return;

    const updatedAnnotations = annotations.map(ann => {
      if (ann.id === annotationId) {
        return { ...ann, x, y };
      }
      return ann;
    });
    setAnnotations(updatedAnnotations);
    SyncManager.saveAnnotations(updatedAnnotations);

    if (targetAnn.highlightId) {
      const updatedHighlights = highlights.map(hl => {
        if (hl.id === targetAnn.highlightId) {
          const w = hl.w || 3;
          const h = hl.h || 3;
          return {
            ...hl,
            x: x - w / 2,
            y: y - h / 2
          };
        }
        return hl;
      });
      setHighlights(updatedHighlights);
      SyncManager.saveHighlights(updatedHighlights);
    }

    triggerCloudSync();
  };

  const handleAddPrediction = (text: string, coords?: { x: number; y: number }) => {
    if (!selectedDoc) return;

    const newPrediction: Prediction = {
      id: `pred-${Date.now()}`,
      documentId: selectedDoc.id,
      text,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...(coords || {})
    };

    const updatedPredictions = [...predictions, newPrediction];
    setPredictions(updatedPredictions);
    SyncManager.savePredictions(updatedPredictions);
    triggerCloudSync();
  };

  const handleUpdatePredictionStatus = (id: string, status: 'pending' | 'correct' | 'incorrect') => {
    const updated = predictions.map(p => p.id === id ? { ...p, status } : p);
    setPredictions(updated);
    SyncManager.savePredictions(updated);
    triggerCloudSync();
  };

  const handleDeletePrediction = (id: string) => {
    const updated = predictions.filter(p => p.id !== id);
    setPredictions(updated);
    SyncManager.savePredictions(updated);
    triggerCloudSync();
  };

  // 5. AI Integrations via Express API Proxy
  const handleAskAI = async (text: string, type: 'explain' | 'predict' | 'question') => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ textSelection: text, type })
      });

      const data = await response.json();
      if (data.success) {
        setAiResult(data.result);
      } else {
        setAiResult(`Error de IA: ${data.error}`);
      }
    } catch (err) {
      setAiResult('Error de red al conectar con el Asistente de IA Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateTeacherReport = async () => {
    if (!selectedDoc) return;
    setAiLoading(true);
    setAiResult(null);
    setReportOpen(true); // Open screen immediately to show placeholder progress bars
    try {
      const docHighlights = highlights.filter(h => h.documentId === selectedDoc.id);
      const docAnnotations = annotations.filter(a => a.documentId === selectedDoc.id);
      const docPredictions = predictions.filter(p => p.documentId === selectedDoc.id);

      const response = await fetch('/api/ai/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentTitle: selectedDoc.title,
          highlights: docHighlights,
          annotations: docAnnotations,
          predictions: docPredictions
        })
      });

      const data = await response.json();
      if (data.success) {
        setActiveReportData({
          summary: data.summary,
          pedagogicalFeedback: data.pedagogicalFeedback
        });
      } else {
        alert(`No se pudo compilar el informe con IA: ${data.error}`);
      }
    } catch (err) {
      alert('Error de conexión al compilar el informe de estudio.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div id="application-container" className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* If Teacher Report view is toggled, display it as a full-screen board */}
      {reportOpen && selectedDoc ? (
        <TeacherReport
          document={selectedDoc}
          highlights={highlights}
          annotations={annotations}
          predictions={predictions}
          studentName={studentName}
          onSetStudentName={setStudentName}
          reportData={activeReportData}
          onClose={() => setReportOpen(false)}
        />
      ) : (
        <>
          {/* Main Workspace Layout */}
          {!selectedDoc ? (
            /* Elegant Landing Page Dashboard */
            <div className="max-w-4xl mx-auto w-full px-4 py-8 md:py-12 flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Reader Identification Header & Input */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-4">
                  <GraduationCap size={14} />
                  <span>Plataforma de Comprensión Lectora</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  ¿Qué vamos a leer hoy, <span className="text-indigo-600 underline decoration-indigo-200 decoration-wavy">{studentName || 'Lector'}</span>?
                </h1>
                <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto font-medium">
                  Identifícate para sincronizar tus marcadores, subrayados, anotaciones y predicciones en la nube de forma instantánea.
                </p>

                {/* Identification profile card */}
                <div className="mt-6 max-w-sm mx-auto bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <Edit3 size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Nombre Completo del Estudiante</label>
                    <input
                      id="student-name-landing-input"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Escribe tu nombre..."
                      className="w-full bg-transparent text-sm text-slate-800 font-bold focus:outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Layout: Possible Readings vs Cargar Lectura */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Left/Main Column: Possible Readings */}
                <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-600 animate-pulse" />
                      <h2 className="font-bold text-slate-800 text-sm md:text-base">Selecciona una de tus lecturas</h2>
                    </div>
                    <span className="text-xs bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded-full border border-slate-100">
                      {documents.length} disponibles
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 max-h-[340px] overflow-y-auto pr-1">
                    {documents.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-sm font-medium">No hay lecturas cargadas en tu perfil.</p>
                        <p className="text-xs text-slate-300 mt-1">Usa la sección derecha para cargar un archivo.</p>
                      </div>
                    ) : (
                      documents.map(doc => {
                        const docHighlights = highlights.filter(h => h.documentId === doc.id).length;
                        const docAnnotations = annotations.filter(a => a.documentId === doc.id).length;
                        const docPredictions = predictions.filter(p => p.documentId === doc.id).length;

                        return (
                          <div
                            key={doc.id}
                            id={`btn-landing-select-doc-${doc.id}`}
                            onClick={() => handleSelectDocument(doc)}
                            className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/40 hover:bg-white transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center justify-between gap-4 group"
                          >
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors leading-tight truncate">
                                {doc.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                                  {doc.format}
                                </span>
                                {doc.hasImages && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100">
                                    Con imágenes
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Badges metrics */}
                            <div className="flex items-center gap-2 shrink-0">
                              {docHighlights > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full" title="Subrayados activos">
                                  🖍️ {docHighlights}
                                </span>
                              )}
                              {docAnnotations > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full" title="Anotaciones activas">
                                  💬 {docAnnotations}
                                </span>
                              )}
                              {docPredictions > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full" title="Predicciones activas">
                                  🔮 {docPredictions}
                                </span>
                              )}
                              <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <ChevronRight size={14} />
                              </div>
                              <button
                                type="button"
                                id={`btn-delete-doc-${doc.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingDoc(doc);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Eliminar esta lectura"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Cargar Lectura / Upload & Manual paste */}
                <div className="md:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                      <FileUp size={16} className="text-indigo-600" />
                      Cargar nueva lectura
                    </h2>
                  </div>

                  {/* Upload Drag/Drop Area */}
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative group cursor-pointer ${
                    uploading ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-500/50'
                  }`}>
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-600 py-2">
                        <RefreshCw size={24} className="animate-spin" />
                        <p className="text-xs font-bold leading-tight">Procesando y extrayendo texto...</p>
                        <p className="text-[9px] opacity-75">Esto puede tardar unos segundos</p>
                      </div>
                    ) : (
                      <>
                        <input
                          id="landing-file-upload-input"
                          type="file"
                          accept=".html,.htm,.md,.txt,.pdf,.docx,.xlsx,.xls"
                          disabled={uploading}
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-slate-700">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <FileUp size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">Subir archivo académico</p>
                            <p className="text-[10px] opacity-70 mt-0.5">Formatos: PDF, Word, Excel, HTML, Markdown, TXT</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-1.5 animate-in fade-in duration-200">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-500" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="h-px bg-slate-100 flex-1"></div>
                    <span className="text-[9px] font-bold uppercase tracking-wider">O también</span>
                    <div className="h-px bg-slate-100 flex-1"></div>
                  </div>

                  {/* Paste manual text trigger */}
                  <button
                    onClick={() => setShowAddDocModal(true)}
                    className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} />
                    Pegar texto manualmente
                  </button>

                  {/* Sincronización offline info block */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-500 space-y-1.5 mt-auto leading-relaxed">
                    <div className="flex items-center justify-between font-bold text-slate-600 mb-1">
                      <span>Soporte Offline & Cloud</span>
                      {isOnline ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">● Online</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-0.5">● Offline</span>
                      )}
                    </div>
                    <p>Tu lectura se visualizará manteniendo su diagramación e imágenes originales, y tus notas se sincronizarán con la base de datos de manera segura.</p>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            /* Immersive Reader Workspace with focus on active document */
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
              <div className="flex-1 h-full p-4 md:p-6 overflow-hidden flex flex-col min-w-0">
                <DocumentViewer
                  document={selectedDoc}
                  highlights={highlights}
                  annotations={annotations}
                  predictions={predictions}
                  onAddHighlight={handleAddHighlight}
                  onDeleteHighlight={handleDeleteHighlight}
                  onSelectHighlight={setSelectedHighlight}
                  selectedHighlight={selectedHighlight}
                  onAddAnnotation={handleAddAnnotation}
                  onAddPrediction={handleAddPrediction}
                  onUpdatePredictionStatus={handleUpdatePredictionStatus}
                  onDeletePrediction={handleDeletePrediction}
                  onUpdateDocumentContent={handleUpdateDocumentContent}
                  onAddCompiledDocument={handleAddCompiledDocument}
                  onAskAI={handleAskAI}
                  aiLoading={aiLoading}
                  aiResult={aiResult}
                  onClearAIResult={() => setAiResult(null)}
                  onGenerateAIReport={handleGenerateTeacherReport}
                  studentName={studentName}
                  onBackToLanding={() => setSelectedDoc(null)}
                  onUpdateAnnotationCoords={handleUpdateAnnotationCoords}
                  onUpdateHighlightColor={handleUpdateHighlightColor}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* MANUAL TEXT PASTE DIALOG / MODAL */}
      {showAddDocModal && (
        <div id="add-document-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm md:text-base">Pega tu Propio Texto</h3>
              </div>
              <button 
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualDocument} className="p-6 flex flex-col space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Título del Documento</label>
                <input
                  id="new-doc-title-input"
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Ej: El Ciclo del Carbono, Apuntes de Geografía..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Formato / Marcado</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDocFormat('markdown')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${newDocFormat === 'markdown' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDocFormat('html')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${newDocFormat === 'html' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDocFormat('text')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${newDocFormat === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      Texto Plano
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Contenido del Texto</label>
                <textarea
                  id="new-doc-content-textarea"
                  required
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder={
                    newDocFormat === 'markdown' ? 'Usa sintaxis Markdown estándar para títulos, negritas o imágenes: \n\n# Mi Título \nEscribe párrafos... \n![Diagrama](https://ejemplo.com/imagen.png)' :
                    newDocFormat === 'html' ? '<h1>Título</h1>\n<p>Escribe tu código HTML estructurado aquí...</p>' :
                    'Escribe tu texto libre plano...'
                  }
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-40 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  Crear Documento
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DELETE DOCUMENT CONFIRMATION DIALOG / MODAL */}
      {deletingDoc && (
        <div id="delete-document-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-red-50 bg-red-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600 animate-bounce" />
                <h3 className="font-bold text-red-800 text-sm md:text-base">¿Eliminar lectura?</h3>
              </div>
              <button 
                onClick={() => setDeletingDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar la lectura <strong className="text-slate-900 font-bold">"{deletingDoc.title}"</strong> de tu biblioteca?
              </p>
              
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 leading-normal">
                  <strong className="font-bold">Advertencia importante:</strong> Esta acción es irreversible y eliminará de forma permanente todos tus subrayados, notas al margen y predicciones lectoras asociadas.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingDoc(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDocument(deletingDoc.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  Sí, eliminar lectura
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PDF IMPORT PAGE RANGE SELECT MODAL */}
      {pdfUploadPending && (
        <div id="pdf-range-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <FileUp size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">Ajustes de Lectura de PDF</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                El archivo <strong className="text-slate-700">"{pdfUploadPending.file.name}"</strong> contiene <strong className="text-indigo-600">{pdfUploadPending.totalPages}</strong> páginas. Selecciona el rango que deseas visualizar.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">¿Qué páginas quieres visualizar?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfPageRangeMode('all')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    pdfPageRangeMode === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todas las páginas
                </button>
                <button
                  type="button"
                  onClick={() => setPdfPageRangeMode('range')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    pdfPageRangeMode === 'range'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Elegir un rango
                </button>
              </div>

              {pdfPageRangeMode === 'range' && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Desde</span>
                    <input
                      type="number"
                      min={1}
                      max={pdfUploadPending.totalPages}
                      value={pdfStartPage}
                      onChange={(e) => setPdfStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex-1 flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
                    <input
                      type="number"
                      min={pdfStartPage}
                      max={pdfUploadPending.totalPages}
                      value={pdfEndPage}
                      onChange={(e) => setPdfEndPage(Math.min(pdfUploadPending.totalPages, Math.max(pdfStartPage, parseInt(e.target.value) || pdfStartPage)))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPdfUploadPending(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPdfImport}
                disabled={uploading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
              >
                {uploading ? 'Importando...' : 'Procesar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
