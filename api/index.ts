import express from 'express';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReadingDocument, Highlight, Annotation, Prediction, SyncPayload } from '../src/types';
import { preloadedDocuments } from '../src/utils/preloadedDocs';

const requireModule = createRequire(import.meta.url);
const pdf = requireModule('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const app = express();
const DB_FILE = path.join(process.cwd(), 'data-store.json');

const DEFAULT_AI_HEADERS = {
  'User-Agent': 'aistudio-build'
};

function createAIModel(apiKey: string, modelName = 'gemini-3.5-flash') {
  const ai = new GoogleGenerativeAI(apiKey);
  return ai.getGenerativeModel({ model: modelName }, { customHeaders: DEFAULT_AI_HEADERS });
}

app.use(express.json({ limit: '50mb' }));

app.post('/api/parse-document', async (req, res) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ success: false, error: 'Se requiere fileName y base64Data' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const extension = fileName.split('.').pop()?.toLowerCase();

    let extractedText = '';
    let format: 'text' | 'html' | 'markdown' = 'text';

    if (extension === 'pdf') {
      format = 'text';
      let extractedPdfText = '';
      try {
        let pdfParser: any = pdf;
        if (typeof pdfParser !== 'function' && pdfParser && typeof pdfParser.default === 'function') {
          pdfParser = pdfParser.default;
        }
        if (typeof pdfParser === 'function') {
          const data = await pdfParser(buffer);
          extractedPdfText = data.text || '';
        } else {
          console.warn('Librería pdf-parse no exportó una función ejecutable directa.');
        }
      } catch (pdfErr: any) {
        console.error('Error al parsear PDF con PDFParse:', pdfErr);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if ((!extractedPdfText.trim() || extractedPdfText.trim().length < 150) && apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          const model = createAIModel(apiKey, 'gemini-3.5-flash');
          const response = await model.generateContent({
            contents: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              },
              {
                text: 'Extrae de forma limpia, continua y estructurada todo el texto en español de este documento PDF. Respeta los párrafos, las secciones de los títulos y el orden de lectura natural de arriba hacia abajo y de izquierda a derecha. No incluyas comentarios, explicaciones del sistema ni resúmenes; devuelve única y exclusivamente el texto del documento original.'
              }
            ]
          });
          const extracted = response.response.text();
          if (extracted && extracted.trim()) {
            extractedPdfText = extracted;
          }
        } catch (geminiErr: any) {
          console.error('Failed Gemini PDF OCR fallback:', geminiErr);
        }
      }

      extractedText = extractedPdfText;
    } else if (extension === 'docx') {
      const result = await mammoth.convertToHtml({ buffer });
      extractedText = result.value || '';
      format = 'html';
    } else if (extension === 'xlsx' || extension === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let htmlContent = '';
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const tableHtml = XLSX.utils.sheet_to_html(sheet);
        if (tableHtml && tableHtml.trim()) {
          htmlContent += `
            <div class="excel-sheet-container mb-8">
              <h3 class="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1 mb-3">Hoja: ${sheetName}</h3>
              <div class="overflow-x-auto border border-slate-200 rounded-xl max-w-full">
                ${tableHtml}
              </div>
            </div>`;
        }
      });
      extractedText = htmlContent.trim();
      format = 'html';
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension || '')) {
      return res.json({
        success: true,
        text: '',
        format: 'text',
        extractionFailed: true,
        imageUrl: `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${base64Data}`
      });
    } else {
      return res.status(400).json({ success: false, error: `Extensión de archivo .${extension} no soportada.` });
    }

    if (!extractedText.trim()) {
      return res.json({
        success: true,
        text: '',
        format,
        extractionFailed: true
      });
    }

    res.json({
      success: true,
      text: extractedText,
      format,
      extractionFailed: false
    });
  } catch (error: any) {
    console.error('Error al procesar el archivo:', error);
    res.json({
      success: true,
      text: '',
      extractionFailed: true,
      error: `Error de lectura: ${error.message || error}`
    });
  }
});

function getStoredData(): SyncPayload {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: SyncPayload = {
      documents: preloadedDocuments,
      highlights: [],
      annotations: [],
      predictions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, returning default:', err);
    return {
      documents: preloadedDocuments,
      highlights: [],
      annotations: [],
      predictions: []
    };
  }
}

function saveStoredData(data: SyncPayload) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to database file:', err);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/sync', (req, res) => {
  try {
    const clientState: SyncPayload = req.body;
    const serverState = getStoredData();

    const deletedDocIdsSet = new Set<string>(clientState.deletedDocIds || []);

    const mergedDocsMap = new Map<string, ReadingDocument>();
    serverState.documents.forEach(doc => {
      if (!deletedDocIdsSet.has(doc.id)) {
        mergedDocsMap.set(doc.id, doc);
      }
    });
    clientState.documents.forEach(clientDoc => {
      if (!deletedDocIdsSet.has(clientDoc.id)) {
        const serverDoc = mergedDocsMap.get(clientDoc.id);
        if (!serverDoc) {
          mergedDocsMap.set(clientDoc.id, clientDoc);
        } else {
          const clientTime = new Date(clientDoc.updatedAt).getTime();
          const serverTime = new Date(serverDoc.updatedAt).getTime();
          if (clientTime > serverTime) {
            mergedDocsMap.set(clientDoc.id, clientDoc);
          }
        }
      }
    });

    const mergedHighlightsMap = new Map<string, Highlight>();
    serverState.highlights.forEach(h => {
      if (!deletedDocIdsSet.has(h.documentId)) {
        mergedHighlightsMap.set(h.id, h);
      }
    });
    clientState.highlights.forEach(h => {
      if (!deletedDocIdsSet.has(h.documentId)) {
        mergedHighlightsMap.set(h.id, h);
      }
    });

    const mergedAnnotationsMap = new Map<string, Annotation>();
    serverState.annotations.forEach(a => {
      if (!deletedDocIdsSet.has(a.documentId)) {
        mergedAnnotationsMap.set(a.id, a);
      }
    });
    clientState.annotations.forEach(a => {
      if (!deletedDocIdsSet.has(a.documentId)) {
        mergedAnnotationsMap.set(a.id, a);
      }
    });

    const mergedPredictionsMap = new Map<string, Prediction>();
    serverState.predictions.forEach(p => {
      if (!deletedDocIdsSet.has(p.documentId)) {
        mergedPredictionsMap.set(p.id, p);
      }
    });
    clientState.predictions.forEach(p => {
      if (!deletedDocIdsSet.has(p.documentId)) {
        mergedPredictionsMap.set(p.id, p);
      }
    });

    const mergedState: SyncPayload = {
      documents: Array.from(mergedDocsMap.values()),
      highlights: Array.from(mergedHighlightsMap.values()),
      annotations: Array.from(mergedAnnotationsMap.values()),
      predictions: Array.from(mergedPredictionsMap.values())
    };

    saveStoredData(mergedState);

    res.json({
      success: true,
      documents: mergedState.documents,
      highlights: mergedState.highlights,
      annotations: mergedState.annotations,
      predictions: mergedState.predictions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: 'Internal sync error' });
  }
});

export default app;
