/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReadingDocument, Highlight, Annotation, Prediction } from '../types';
import { Sparkles, Printer, ArrowLeft, GraduationCap, Calendar, User, TrendingUp, Award } from 'lucide-react';

interface TeacherReportProps {
  document: ReadingDocument;
  highlights: Highlight[];
  annotations: Annotation[];
  predictions: Prediction[];
  studentName: string;
  onSetStudentName: (name: string) => void;
  reportData: { summary: string; pedagogicalFeedback: string } | null;
  onClose: () => void;
}

export default function TeacherReport({
  document,
  highlights,
  annotations,
  predictions,
  studentName,
  onSetStudentName,
  reportData,
  onClose
}: TeacherReportProps) {
  // Compute analytics
  const docHighlights = highlights.filter(h => h.documentId === document.id);
  const docAnnotations = annotations.filter(a => a.documentId === document.id);
  const docPredictions = predictions.filter(p => p.documentId === document.id);

  const stats = {
    yellow: docHighlights.filter(h => h.color === 'yellow').length,
    green: docHighlights.filter(h => h.color === 'green').length,
    blue: docHighlights.filter(h => h.color === 'blue').length,
    orange: docHighlights.filter(h => h.color === 'orange').length
  };

  const totalHighlights = docHighlights.length;
  const correctPredictions = docPredictions.filter(p => p.status === 'correct').length;
  const totalPredictions = docPredictions.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="teacher-report-modal" className="bg-slate-50 min-h-screen p-4 md:p-8 flex flex-col animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top action bar */}
      <div className="max-w-4xl w-full mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          id="btn-close-report"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Volver a la Lectura
        </button>

        <button
          id="btn-print-report"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Printer size={16} />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* Main Report Canvas */}
      <div className="max-w-4xl w-full mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 md:p-12 flex flex-col space-y-8 relative print:shadow-none print:border-none print:p-0">
        
        {/* Certificate/Report Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl">
              <GraduationCap size={32} />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Informe Académico Oficial</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">Reporte de Comprensión Lectoras</h1>
            </div>
          </div>
          <div className="text-right flex flex-col text-xs text-slate-400 font-mono">
            <span>ID: {document.id}</span>
            <span>Estilo: Estrategias de Lectura Activa</span>
          </div>
        </div>

        {/* Student metadata fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 rounded-xl p-6 border border-slate-100 print:bg-white print:border-slate-200">
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
              <User size={13} className="text-indigo-500" />
              Estudiante / Alumno
            </div>
            <input
              id="student-name-input"
              type="text"
              value={studentName}
              onChange={(e) => onSetStudentName(e.target.value)}
              placeholder="Ingresa tu nombre completo..."
              className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 print:border-none print:px-0 print:py-0 print:text-base print:font-bold"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
              <Calendar size={13} className="text-indigo-500" />
              Fecha de Evaluación
            </div>
            <p className="text-sm font-semibold text-slate-800 py-1.5">
              {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
              <Award size={13} className="text-indigo-500" />
              Documento Leído
            </div>
            <p className="text-sm font-semibold text-slate-800 py-1.5 truncate">
              {document.title}
            </p>
          </div>

        </div>

        {/* Quantitative metrics charts / progress blocks */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <TrendingUp size={18} className="text-indigo-600" />
            I. Estadísticas de Lectura Científica
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Highlights Distribution */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Densidad de Subrayados por Estrategia</h3>
              <div className="space-y-2">
                
                {/* Yellow (Idea Principal) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Idea Principal</span>
                    <span className="font-mono font-bold text-yellow-600">{stats.yellow} marcas</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${totalHighlights ? (stats.yellow / totalHighlights) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Green (Evidencia) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Evidencias / Hechos Científicos</span>
                    <span className="font-mono font-bold text-green-600">{stats.green} marcas</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: `${totalHighlights ? (stats.green / totalHighlights) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Blue (Concepto Clave) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Conceptos Clave</span>
                    <span className="font-mono font-bold text-blue-600">{stats.blue} marcas</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${totalHighlights ? (stats.blue / totalHighlights) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Orange (Preguntas) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Preguntas / Dudas de Lectura</span>
                    <span className="font-mono font-bold text-orange-600">{stats.orange} marcas</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${totalHighlights ? (stats.orange / totalHighlights) * 100 : 0}%` }}></div>
                  </div>
                </div>

              </div>
            </div>

            {/* General metrics */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Subrayados</span>
                <p className="text-3xl font-extrabold text-indigo-950 mt-1">{totalHighlights}</p>
                <span className="text-[10px] text-slate-400">marcas críticas realizadas</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Anotaciones</span>
                <p className="text-3xl font-extrabold text-indigo-950 mt-1">{docAnnotations.length}</p>
                <span className="text-[10px] text-slate-400">notas al margen creadas</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Predicciones</span>
                <p className="text-3xl font-extrabold text-indigo-950 mt-1">{totalPredictions}</p>
                <span className="text-[10px] text-slate-400">hipótesis planteadas</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tasa de Acierto</span>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                  {totalPredictions ? Math.round((correctPredictions / totalPredictions) * 100) : 0}%
                </p>
                <span className="text-[10px] text-slate-400">{correctPredictions} aciertos logrados</span>
              </div>

            </div>

          </div>
        </div>

        {/* AI report output display */}
        <div className="pt-6 border-t border-slate-100 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles size={18} className="text-indigo-600 animate-pulse" />
            II. Evaluación Pedagógica con Inteligencia Artificial (Gemini API)
          </h2>

          {reportData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: AI summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-indigo-900 bg-indigo-50 rounded px-2.5 py-1 inline-block">Análisis del Perfil Lector</h3>
                <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line font-medium">
                  {reportData.summary}
                </p>
              </div>

              {/* Right Column: Pedagogical suggestions */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-emerald-900 bg-emerald-50 rounded px-2.5 py-1 inline-block">Recomendaciones Pedagógicas</h3>
                <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line font-medium">
                  {reportData.pedagogicalFeedback}
                </p>
              </div>

            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl bg-indigo-50/10">
              <p className="text-sm text-slate-500 font-medium">Falta generar el informe pedagógico por IA.</p>
              <p className="text-xs text-slate-400 mt-1">Haz clic en "Generar Informe con IA" en la pestaña Exportar del menú de estrategias.</p>
            </div>
          )}
        </div>

        {/* Full annotations transcription list (useful for grading!) */}
        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">III. Transcripción de Glosas y Anotaciones</h2>
          
          {docHighlights.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No se registraron apuntes detallados para transcribir.</p>
          ) : (
            <div className="space-y-3">
              {docHighlights.map((h, idx) => {
                const note = docAnnotations.find(a => a.highlightId === h.id);
                return (
                  <div key={h.id} className="border-b border-slate-100 pb-3 last:border-none">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-400 uppercase">Índice {idx + 1} - {h.category}</span>
                      <span className="text-slate-300 font-mono">ID: {h.id}</span>
                    </div>
                    <p className="text-xs text-slate-800 italic font-semibold mt-1">
                      "{h.text}"
                    </p>
                    {note && (
                      <p className="text-xs text-indigo-900 font-medium bg-indigo-50/40 p-2 rounded-lg mt-1.5 border border-indigo-100/30">
                        <strong className="font-bold uppercase text-[9px] block text-indigo-500">Anotación:</strong>
                        {note.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
