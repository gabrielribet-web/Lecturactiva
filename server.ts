/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { ReadingDocument, Highlight, Annotation, Prediction, SyncPayload } from "./src/types";
import { preloadedDocuments } from "./src/utils/preloadedDocs";
import { createRequire } from "module";
const requireModule = createRequire(import.meta.url);
const pdf = requireModule("pdf-parse");
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data-store.json");

// Middleware to parse JSON
app.use(express.json({ limit: '50mb' }));

// File parsing API for PDF, Word, and Excel
app.post("/api/parse-document", async (req, res) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ success: false, error: "Se requiere fileName y base64Data" });
    }

    const buffer = Buffer.from(base64Data, "base64");
    const extension = fileName.split(".").pop()?.toLowerCase();

    let extractedText = "";

    if (extension === "pdf") {
      let extractedPdfText = "";
      try {
        let pdfParser = pdf;
        if (typeof pdfParser !== "function" && pdfParser && typeof pdfParser.default === "function") {
          pdfParser = pdfParser.default;
        }
        if (typeof pdfParser === "function") {
          const data = await pdfParser(buffer);
          extractedPdfText = data.text || "";
        } else {
          console.warn("Librería pdf-parse no exportó una función ejecutable directa.");
        }
      } catch (pdfErr: any) {
        console.error("Error al parsear PDF con PDFParse:", pdfErr);
      }

      // Optimization: If the extracted text is empty, very short (scanned PDF), or malformed,
      // and we have a Gemini API Key, use Gemini's multimodal PDF capabilities to perform high-fidelity OCR!
      const apiKey = process.env.GEMINI_API_KEY;
      if ((!extractedPdfText.trim() || extractedPdfText.trim().length < 150) && apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          console.log("PDF parsed text was empty or too short. Performing high-fidelity Gemini PDF OCR...");
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              },
              {
                text: "Extrae de forma limpia, continua y estructurada todo el texto en español de este documento PDF. Respeta los párrafos, las secciones de los títulos y el orden de lectura natural de arriba hacia abajo y de izquierda a derecha. No incluyas comentarios, explicaciones del sistema ni resúmenes; devuelve única y exclusivamente el texto del documento original."
              }
            ]
          });
          if (response.text && response.text.trim()) {
            extractedPdfText = response.text;
            console.log("Successfully extracted text from PDF using Gemini OCR.");
          }
        } catch (geminiErr: any) {
          console.error("Failed Gemini PDF OCR fallback:", geminiErr);
        }
      }

      extractedText = extractedPdfText;
    } else if (extension === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } else if (extension === "xlsx" || extension === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let text = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_txt(sheet);
        if (csv && csv.trim()) {
          text += `--- Hoja: ${sheetName} ---\n${csv}\n\n`;
        }
      });
      extractedText = text.trim();
    } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(extension || "")) {
      return res.json({
        success: true,
        text: "",
        extractionFailed: true,
        imageUrl: `data:image/${extension === "jpg" ? "jpeg" : extension};base64,${base64Data}`
      });
    } else {
      return res.status(400).json({ success: false, error: `Extensión de archivo .${extension} no soportada.` });
    }

    if (!extractedText.trim()) {
      return res.json({
        success: true,
        text: "",
        extractionFailed: true
      });
    }

    res.json({
      success: true,
      text: extractedText,
      extractionFailed: false
    });
  } catch (error: any) {
    console.error("Error al procesar el archivo:", error);
    res.json({
      success: true,
      text: "",
      extractionFailed: true,
      error: `Error de lectura: ${error.message || error}`
    });
  }
});

/**
 * Initialize and load database from disk or seed with default educational documents
 */
function getStoredData(): SyncPayload {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: SyncPayload = {
      documents: preloadedDocuments,
      highlights: [],
      annotations: [],
      predictions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, returning default:", err);
    return {
      documents: preloadedDocuments,
      highlights: [],
      annotations: [],
      predictions: []
    };
  }
}

/**
 * Persist synced database state back to disk
 */
function saveStoredData(data: SyncPayload) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to database file:", err);
  }
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Cloud Synchronization endpoint
app.post("/api/sync", (req, res) => {
  try {
    const clientState: SyncPayload = req.body;
    const serverState = getStoredData();

    const deletedDocIdsSet = new Set<string>(clientState.deletedDocIds || []);

    // Two-way merge helper for Documents
    const mergedDocsMap = new Map<string, ReadingDocument>();
    // Seed with server records (ignoring deleted)
    serverState.documents.forEach(doc => {
      if (!deletedDocIdsSet.has(doc.id)) {
        mergedDocsMap.set(doc.id, doc);
      }
    });
    // Merge client records (ignoring deleted)
    clientState.documents.forEach(clientDoc => {
      if (!deletedDocIdsSet.has(clientDoc.id)) {
        const serverDoc = mergedDocsMap.get(clientDoc.id);
        if (!serverDoc) {
          mergedDocsMap.set(clientDoc.id, clientDoc);
        } else {
          // Keep the most recently updated one
          const clientTime = new Date(clientDoc.updatedAt).getTime();
          const serverTime = new Date(serverDoc.updatedAt).getTime();
          if (clientTime > serverTime) {
            mergedDocsMap.set(clientDoc.id, clientDoc);
          }
        }
      }
    });

    // Merge Highlights (deduplicate by unique ID and ignore deleted)
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

    // Merge Annotations (deduplicate by unique ID and ignore deleted)
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

    // Merge Predictions (deduplicate by unique ID and ignore deleted)
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

    // Compile new state
    const mergedState: SyncPayload = {
      documents: Array.from(mergedDocsMap.values()),
      highlights: Array.from(mergedHighlightsMap.values()),
      annotations: Array.from(mergedAnnotationsMap.values()),
      predictions: Array.from(mergedPredictionsMap.values())
    };

    // Save to server database file
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
    console.error("Sync error:", error);
    res.status(500).json({ success: false, error: "Internal sync error" });
  }
});

// 3. AI Copilot endpoint: Explain, Predict, or Question selected text
app.post("/api/ai/analyze", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(403).json({
      success: false,
      error: "La clave GEMINI_API_KEY no está configurada en los Secretos del workspace."
    });
  }

  try {
    const { textSelection, type } = req.body;
    if (!textSelection || !textSelection.trim()) {
      return res.status(400).json({ success: false, error: "Selección de texto vacía" });
    }

    // Lazy initialization with custom user-agent for telemetry
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let systemInstruction = "";
    let prompt = "";

    if (type === "explain") {
      systemInstruction = "Eres un tutor académico excelente y cercano. Explica el fragmento de texto seleccionado en español sencillo, destacando su significado principal y aclarando términos complejos de forma directa, breve (máximo 120 palabras) y educativa.";
      prompt = `Explica este fragmento del texto que estoy leyendo:\n\n"${textSelection}"`;
    } else if (type === "predict") {
      systemInstruction = "Eres un guía de estrategias de comprensión lectora. Basándote en el fragmento proporcionado, realiza una predicción lógica y coherente sobre lo que el texto abordará o explicará a continuación en español. Sé conciso (máximo 100 palabras).";
      prompt = `Haz una predicción lectora inteligente de lo que sigue basándote en este fragmento:\n\n"${textSelection}"`;
    } else if (type === "question") {
      systemInstruction = "Eres un profesor evaluador de comprensión de lectura. Formula una pregunta de pensamiento crítico desafiante pero clara en español sobre este fragmento específico del texto para comprobar mi nivel de análisis. No incluyas la respuesta, solo la pregunta de forma amigable (máximo 70 palabras).";
      prompt = `Formula una pregunta clave sobre este fragmento:\n\n"${textSelection}"`;
    } else {
      return res.status(400).json({ success: false, error: "Tipo de análisis no soportado" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    res.json({
      success: true,
      result: response.text || "No se pudo generar una respuesta."
    });
  } catch (error: any) {
    console.error("AI Analyze error:", error);
    res.status(500).json({ success: false, error: error.message || "Error al llamar a Gemini API" });
  }
});

// 4. AI Teacher Report compiler
app.post("/api/ai/report", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(403).json({
      success: false,
      error: "La clave GEMINI_API_KEY no está configurada en los Secretos del workspace."
    });
  }

  try {
    const { documentTitle, highlights, annotations, predictions } = req.body;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const studentWorkSummary = `
      Documento leído: "${documentTitle}"
      Subrayados realizados: ${JSON.stringify(highlights.map((h: any) => ({ texto: h.text, tipo: h.category })))}
      Anotaciones hechas: ${JSON.stringify(annotations.map((a: any) => a.comment))}
      Predicciones formuladas: ${JSON.stringify(predictions.map((p: any) => ({ prediccion: p.text, estado: p.status })))}
    `;

    const systemInstruction = "Eres un asesor pedagógico de estrategias de estudio. Tu objetivo es evaluar el trabajo de lectura activa del estudiante a partir de sus subrayados por código de colores, notas de margen y predicciones. Debes responder con un JSON que contenga exactamente dos claves: 'summary' (un resumen evaluativo de su técnica de estudio y comprensión del texto) y 'pedagogicalFeedback' (consejos prácticos para el estudiante o su profesor para potenciar su rendimiento académico). Responde estrictamente en formato JSON válido.";

    const prompt = `Analiza el siguiente trabajo de lectura activa del estudiante y genera el informe académico correspondiente:\n\n${studentWorkSummary}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            summary: {
              type: "STRING" as any,
              description: "Resumen detallado de la comprensión del alumno y su metodología de subrayado y anotación."
            },
            pedagogicalFeedback: {
              type: "STRING" as any,
              description: "Sugerencias didácticas y comentarios académicos valiosos para el repaso o informe docente."
            }
          },
          required: ["summary", "pedagogicalFeedback"]
        },
        temperature: 0.5
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");

    res.json({
      success: true,
      summary: parsedResponse.summary || "No se pudo compilar el resumen del informe.",
      pedagogicalFeedback: parsedResponse.pedagogicalFeedback || "No se pudieron compilar las recomendaciones pedagógicas."
    });
  } catch (error: any) {
    console.error("AI Report error:", error);
    res.status(500).json({ success: false, error: error.message || "Error al compilar el informe con Gemini" });
  }
});


// 5. Optimize Document Text (re-format, OCR cleanup, enhance readability)
app.post("/api/ai/optimize-document-text", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(403).json({
      success: false,
      error: "La clave GEMINI_API_KEY no está configurada en los Secretos del workspace."
    });
  }

  try {
    const { text, title } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "El texto a optimizar está vacío." });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = "Eres un especialista académico en edición de textos e inteligencia lectora. Tu misión es tomar el texto de un documento (el cual puede venir con caracteres extraños, palabras unidas, saltos de línea incorrectos o desordenado debido al procesamiento de PDF) y optimizar su legibilidad, corrigiendo errores tipográficos y ortográficos, separando párrafos correctamente y garantizando un flujo continuo y estructurado de lectura. MUY IMPORTANTE: No resumas el texto, no omitas contenido valioso y no añadas comentarios introductorios o aclaratorios personales. Devuelve únicamente el texto limpio y optimizado, listo para leer y subrayar.";
    const prompt = `Por favor, limpia y optimiza la legibilidad del siguiente texto titulado "${title || "Documento sin título"}" sin omitir información:\n\n${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });

    res.json({
      success: true,
      optimizedText: response.text || text
    });
  } catch (error: any) {
    console.error("AI Optimize Text error:", error);
    res.status(500).json({ success: false, error: error.message || "Error al optimizar el texto con Gemini" });
  }
});


// Vite Dev Server Integration & Static Production build setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static files server configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Application running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
