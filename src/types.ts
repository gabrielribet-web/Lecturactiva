/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReadingDocument {
  id: string;
  title: string;
  content: string;
  format: 'html' | 'markdown' | 'text';
  imageCount: number;
  hasImages: boolean;
  createdAt: string;
  updatedAt: string;
  isCustom: boolean; // true if uploaded by user, false if preloaded sample
  extractionFailed?: boolean; // true if the app struggled to extract the text automatically
  imageUrl?: string; // base64 or URL if loaded as image/visual document
  pages?: string[]; // Multiple pages for visual documents
  hasPdfRaw?: boolean; // True if the raw PDF data is stored in IndexedDB
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'orange' | 'red';

export interface Highlight {
  id: string;
  documentId: string;
  text: string;
  color: HighlightColor;
  category: string; // 'Idea Principal', 'Evidencia', 'Concepto Clave', 'Duda/Pregunta'
  createdAt: string;
  x?: number; // percentage (0-100)
  y?: number; // percentage (0-100)
  w?: number; // percentage (0-100)
  h?: number; // percentage (0-100)
  pageIndex?: number; // 0-based page index for multi-page documents
}

export interface Annotation {
  id: string;
  documentId: string;
  highlightId: string;
  comment: string;
  createdAt: string;
  x?: number; // percentage (0-100) for visual documents
  y?: number; // percentage (0-100) for visual documents
  pageIndex?: number; // 0-based page index for multi-page documents
}

export interface Prediction {
  id: string;
  documentId: string;
  text: string; // The user's reading prediction
  outcome?: string; // What actually happened (if verified)
  status: 'pending' | 'correct' | 'incorrect';
  createdAt: string;
  x?: number; // percentage (0-100) for visual documents
  y?: number; // percentage (0-100) for visual documents
  pageIndex?: number; // 0-based page index for multi-page documents
}

export interface SyncPayload {
  documents: ReadingDocument[];
  highlights: Highlight[];
  annotations: Annotation[];
  predictions: Prediction[];
  deletedDocIds?: string[];
  lastSyncTime?: string;
}

export interface SyncResponse {
  success: boolean;
  documents: ReadingDocument[];
  highlights: Highlight[];
  annotations: Annotation[];
  predictions: Prediction[];
  timestamp: string;
}

export interface AIAnalysisRequest {
  documentId: string;
  textSelection: string;
  type: 'explain' | 'predict' | 'question';
}

export interface AIAnalysisResponse {
  success: boolean;
  result: string;
}

export interface TeacherReportResponse {
  success: boolean;
  summary: string; // AI assessment of the reading strategy
  pedagogicalFeedback: string; // Suggestions for teachers/students
}
