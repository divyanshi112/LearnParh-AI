import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { getStudyPlanData } from '../services/studyPlanService.js';
import {
  deleteStudyMaterial,
  indexStudyMaterial,
  listStudyMaterials,
  uploadStudyMaterial,
  viewStudyMaterial,
} from '../services/studyMaterialService.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_LABEL = '10 MB';
const isIndexed = (document) => (
  ['indexed', 'ready'].includes(document.indexingStatus) && !document.needsReindexing
);

const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function StudyMaterials() {
  const fileInput = useRef(null);
  const [subjects, setSubjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexingId, setIndexingId] = useState('');
  const [viewingId, setViewingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studyPlan, materials] = await Promise.all([
        getStudyPlanData(),
        listStudyMaterials(),
      ]);
      setSubjects(studyPlan.subjects);
      setDocuments(materials);
      setSubjectId((current) =>
        studyPlan.subjects.some((subject) => subject._id === current)
          ? current
          : studyPlan.subjects[0]?._id || ''
      );
    } catch (requestError) {
      setError(requestError.message || 'Could not load study materials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');
    setNotice('');
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      event.target.value = '';
      setError(`PDF files must be ${MAX_FILE_LABEL} or smaller.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile || !subjectId || uploading) return;

    setUploading(true);
    setError('');
    setNotice('');
    try {
      const uploadedDocument = await uploadStudyMaterial(selectedFile, subjectId);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setNotice('PDF uploaded and text extracted. Preparing it for AI Tutor questions...');
      let processingError = '';
      try {
        await indexStudyMaterial(uploadedDocument._id);
      } catch (requestError) {
        processingError = requestError.message || 'AI Tutor indexing could not be completed.';
      }
      await loadData();
      if (processingError) {
        setNotice('');
        setError(`PDF uploaded and its extracted text was saved, but AI Tutor indexing failed: ${processingError}`);
      } else {
        setNotice('Study material uploaded, processed, and ready for AI Tutor questions.');
      }
    } catch (requestError) {
      await loadData();
      setError(requestError.message || 'Could not upload this study material.');
    } finally {
      setUploading(false);
    }
  };

  const handleIndex = async (document) => {
    setIndexingId(String(document._id));
    setError('');
    setNotice('');
    try {
      await indexStudyMaterial(document._id);
      setNotice(`${document.originalName} is ready for AI Tutor questions.`);
      await loadData();
    } catch (requestError) {
      await loadData();
      setError(requestError.message || 'Could not process this study material.');
    } finally {
      setIndexingId('');
    }
  };

  const handleView = async (document) => {
    setViewingId(String(document._id));
    setError('');
    try {
      await viewStudyMaterial(document._id);
    } catch (requestError) {
      setError(requestError.message || 'Could not open this PDF.');
    } finally {
      setViewingId('');
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm(`Delete "${document.originalName}"? This cannot be undone.`)) return;
    setDeletingId(String(document._id));
    setError('');
    setNotice('');
    try {
      await deleteStudyMaterial(document._id);
      setDocuments((current) => current.filter((item) => item._id !== document._id));
      setNotice('Study material deleted.');
    } catch (requestError) {
      setError(requestError.message || 'Could not delete this study material.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <DashboardLayout pageTitle="Study Materials">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-dark-800 text-brand-blue-light">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Study Materials</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Upload subject PDFs to keep your study resources together. Text is extracted from regular PDFs, and scanned pages are processed with OCR for future study tools.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-white">Upload a PDF</h3>
          <p className="mt-1 text-sm text-slate-400">PDF only · Up to {MAX_FILE_LABEL} · Up to 500 pages</p>

          {loading ? (
            <div className="flex min-h-24 items-center justify-center text-sm text-slate-400" role="status">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading subjects...
            </div>
          ) : subjects.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-700 p-5 text-center">
              <p className="text-sm text-slate-300">Add a subject to your study plan before uploading materials.</p>
              <Link to="/study-plan" className="button-primary mt-3 inline-flex rounded-lg px-3 py-2 text-sm font-medium">
                Open Study Plan
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end">
              <div>
                <label htmlFor="material-subject" className="mb-1.5 block text-sm font-medium text-slate-200">Subject</label>
                <select
                  id="material-subject"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="field-control px-3 py-2.5"
                  required
                >
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material-file" className="mb-1.5 block text-sm font-medium text-slate-200">PDF file</label>
                <input
                  ref={fileInput}
                  id="material-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={chooseFile}
                  className="field-control px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-dark-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200"
                  required
                />
                {selectedFile && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={uploading || loading || !selectedFile || !subjectId}
                className="button-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              >
                {uploading
                  ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Processing PDF...</>
                  : <><Upload className="h-4 w-4" /> Upload PDF</>}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">Your documents</h3>
              <p className="mt-1 text-xs text-slate-400">Only you can view or delete your uploaded files.</p>
            </div>
            <span className="rounded-md border border-slate-700 bg-dark-800 px-2 py-1 text-xs text-slate-400">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-slate-400" role="status">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading your documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-700 px-4 py-9 text-center">
              <FileText className="mx-auto h-7 w-7 text-slate-500" />
              <p className="mt-2 text-sm font-medium text-white">No study materials uploaded yet</p>
              <p className="mt-1 text-xs text-slate-400">Your PDFs will appear here after upload.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {documents.map((document) => {
                const id = String(document._id);
                return (
                  <article key={id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-dark-850 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-dark-800 text-rose-300">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-medium text-white">{document.originalName}</h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {document.subjectName} <span className="mx-1">·</span> {formatDate(document.uploadedAt)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatBytes(document.sizeBytes)} <span className="mx-1">·</span> {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}
                          {document.textCharacters ? ` · ${document.textCharacters.toLocaleString()} text characters extracted` : ''}
                          {document.ocrPageCount ? ` · OCR on ${document.ocrPageCount} ${document.ocrPageCount === 1 ? 'page' : 'pages'}` : ''}
                        </p>
                        <p className={`mt-1 text-[11px] ${
                          isIndexed(document)
                            ? 'text-emerald-400'
                            : document.indexingStatus === 'processing'
                              ? 'text-blue-300'
                              : 'text-amber-300'
                        }`}>
                          {isIndexed(document)
                            ? `Indexed · Ready for AI Tutor${document.embeddingModel ? ` · ${document.embeddingModel}` : ''}`
                            : document.indexingStatus === 'processing'
                              ? 'Preparing semantic search...'
                              : document.indexingError || 'Not indexed for AI Tutor yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                      {!isIndexed(document) && (
                        <button
                          type="button"
                          onClick={() => handleIndex(document)}
                          disabled={Boolean(indexingId) || document.indexingStatus === 'processing'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-dark-800 disabled:opacity-50"
                        >
                          {indexingId === id
                            ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            : <Upload className="h-3.5 w-3.5" />}
                          {indexingId === id
                            ? 'Processing...'
                            : document.needsReindexing
                              ? 'Re-index'
                              : 'Prepare for Tutor'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleView(document)}
                        disabled={viewingId === id || deletingId === id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-dark-800 disabled:opacity-50"
                      >
                        {viewingId === id
                          ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          : <Eye className="h-3.5 w-3.5" />}
                        View PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(document)}
                        disabled={deletingId === id || viewingId === id}
                        aria-label={`Delete ${document.originalName}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/60 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
                      >
                        {deletingId === id
                          ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
