import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  AlertCircle,
  Bot,
  FileText,
  Lightbulb,
  LoaderCircle,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { sendTutorMessage } from '../services/aiService.js';
import {
  indexStudyMaterial,
  listStudyMaterials,
  uploadStudyMaterial,
} from '../services/studyMaterialService.js';

const MarkdownMessage = lazy(() => import('../components/MarkdownMessage.jsx'));
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_LABEL = '10 MB';
const MAX_SELECTED_DOCUMENTS = 20;
const isIndexed = (document) => (
  ['indexed', 'ready'].includes(document.indexingStatus) && !document.needsReindexing
);

const suggestedPrompts = [
  'Explain backpropagation intuitively with a toy example.',
  'What is the difference between Dijkstra and A* algorithms?',
  'Derive the time complexity of QuickSort in best vs worst case.',
  'Generate 3 practice questions on Bayes Theorem.',
];

export default function AITutor() {
  const fileInput = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello! I am your LearnPath AI Tutor. Ask me any question or paste a problem you'd like to work through step by step.",
      time: '11:00 AM',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [indexingDocumentId, setIndexingDocumentId] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
    setDocumentLoading(true);
    try {
      const results = await listStudyMaterials();
      setDocuments(results);
      setSelectedDocumentIds((current) => current.filter((id) =>
        results.some((document) => document._id === id && isIndexed(document))
      ));
    } catch (requestError) {
      setError(requestError.message || 'Could not load your study materials.');
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending || isUploading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError('');
    setIsSending(true);
    try {
      const history = messages
        .filter((entry) => entry.id !== 1)
        .slice(-12)
        .map((entry) => ({
          role: entry.sender === 'ai' ? 'assistant' : 'user',
          text: entry.text.slice(0, 4000),
        }));
      const result = await sendTutorMessage(message, {
        history,
        documentIds: selectedDocumentIds,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: result.response,
          sources: result.sources,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (requestError) {
      setError(requestError.message || 'The AI Tutor request failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handlePdfSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploadStatus('');
    if (file.size > MAX_FILE_BYTES) {
      setError(`PDF files must be ${MAX_FILE_LABEL} or smaller.`);
      return;
    }

    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name}, extracting text (including OCR for scanned pages), and preparing semantic search...`);
    try {
      const uploadedDocument = await uploadStudyMaterial(file);
      setDocuments((current) => [
        uploadedDocument,
        ...current.filter((item) => item._id !== uploadedDocument._id),
      ]);
      setUploadStatus(`${uploadedDocument.originalName} was uploaded and its text was extracted. Preparing semantic search...`);

      let document;
      try {
        document = await indexStudyMaterial(uploadedDocument._id);
      } catch (indexError) {
        await loadDocuments();
        setUploadStatus(`${uploadedDocument.originalName} was uploaded and its extracted text was saved, but AI Tutor indexing failed.`);
        setError(indexError.message || 'AI Tutor indexing could not be completed. The saved PDF can be processed again later.');
        return;
      }

      setDocuments((current) => current.map((item) => (
        item._id === document._id ? document : item
      )));
      const canAttach = selectedDocumentIds.includes(document._id)
        || selectedDocumentIds.length < MAX_SELECTED_DOCUMENTS;
      if (canAttach) {
        setSelectedDocumentIds((current) => (
          current.includes(document._id) ? current : [...current, document._id]
        ));
      }
      setUploadStatus(canAttach
        ? `${document.originalName} is processed and ready for questions.`
        : `${document.originalName} is ready. Remove a selected PDF to attach it; up to ${MAX_SELECTED_DOCUMENTS} PDFs can be used at once.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not upload and process this PDF.');
      await loadDocuments();
    } finally {
      setIsUploading(false);
    }
  };

  const toggleDocument = (documentId) => {
    setSelectedDocumentIds((current) => current.includes(documentId)
      ? current.filter((id) => id !== documentId)
      : [...current, documentId]);
  };

  const handleIndexDocument = async (documentId) => {
    setIndexingDocumentId(documentId);
    setError('');
    try {
      const document = await indexStudyMaterial(documentId);
      setDocuments((current) => current.map((item) => (
        item._id === document._id ? document : item
      )));
      const canAttach = selectedDocumentIds.includes(document._id)
        || selectedDocumentIds.length < MAX_SELECTED_DOCUMENTS;
      if (canAttach) {
        setSelectedDocumentIds((current) => (
          current.includes(document._id) ? current : [...current, document._id]
        ));
      }
      setUploadStatus(canAttach
        ? `${document.originalName} is processed and ready for questions.`
        : `${document.originalName} is ready. Remove a selected PDF to attach it; up to ${MAX_SELECTED_DOCUMENTS} PDFs can be used at once.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not process this PDF.');
      await loadDocuments();
    } finally {
      setIndexingDocumentId('');
    }
  };

  const selectedDocuments = documents.filter((document) =>
    selectedDocumentIds.includes(document._id)
  );

  return (
    <DashboardLayout pageTitle="AI Tutor">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-xl bg-dark-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Powered by Google Gemini</span>
            </div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">24/7 Intelligent Tutor</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Ask questions, get clear explanations, and work through problems step by step.
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-dark-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
            AI Tutor
          </span>
        </div>

        {/* Chat Container */}
        <div className="rounded-xl border border-slate-800 bg-dark-900 overflow-hidden flex flex-col min-h-[480px] h-[min(520px,calc(100dvh-14rem))]">
          {/* Chat Messages Log */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-lg p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-brand-blue text-white rounded-tr-none'
                      : 'bg-dark-850 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {m.sender === 'ai' ? (
                    <Suspense fallback={<p className="whitespace-pre-wrap">{m.text}</p>}>
                      <MarkdownMessage>{m.text}</MarkdownMessage>
                    </Suspense>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  )}
                  {m.sources?.length > 0 && (
                    <div className="mt-3 border-t border-slate-700/80 pt-2.5">
                      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <FileText className="h-3 w-3" /> Sources
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.sources.map((source) => (
                          <span
                            key={`${source.sourceId}-${source.documentId}-${source.pageNumber}`}
                            className="rounded-md border border-slate-700 bg-dark-900/70 px-2 py-1 text-[10px] text-slate-300"
                          >
                            {source.documentName} · p. {source.pageNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1.5 block text-right">
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-slate-400" role="status">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
          {error && (
            <div className="mx-4 sm:mx-6 mb-3 flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Prompts */}
          <div className="px-4 sm:px-6 py-2.5 bg-dark-850 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1 flex-shrink-0">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>Try:</span>
            </span>
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => setInput(p)}
                type="button"
                disabled={isSending}
                className="text-[11px] px-3 py-1.5 rounded-md bg-dark-800 hover:bg-dark-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors flex-shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="border-t border-slate-800 bg-dark-900 px-3 pt-3 sm:px-4 sm:pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfSelection}
                  className="hidden"
                  aria-label="Choose a PDF to upload"
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={isUploading || isSending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-dark-800 disabled:cursor-not-allowed disabled:opacity-50"
                  title={`Attach a PDF (up to ${MAX_FILE_LABEL})`}
                >
                  {isUploading
                    ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    : <Paperclip className="h-3.5 w-3.5" />}
                  {isUploading ? 'Processing PDF' : 'Attach PDF'}
                </button>
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-lg border border-slate-700 px-2.5 py-2 text-xs text-slate-300 hover:bg-dark-800">
                    My PDFs ({documents.length})
                  </summary>
                  <div className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-72 max-w-[85vw] overflow-y-auto rounded-lg border border-slate-700 bg-dark-900 p-2 shadow-xl">
                    {documentLoading ? (
                      <p className="p-2 text-xs text-slate-400">Loading your PDFs...</p>
                    ) : documents.length === 0 ? (
                      <p className="p-2 text-xs text-slate-400">Upload a PDF to get started.</p>
                    ) : (
                      <div className="space-y-1">
                        {documents.map((document) => {
                          const ready = isIndexed(document);
                          return (
                            <div key={document._id} className="flex items-start gap-2 rounded-md p-2 hover:bg-dark-800">
                              <input
                                type="checkbox"
                                checked={selectedDocumentIds.includes(document._id)}
                                disabled={!ready || selectedDocumentIds.length >= MAX_SELECTED_DOCUMENTS && !selectedDocumentIds.includes(document._id)}
                                onChange={() => toggleDocument(document._id)}
                                aria-label={`Use ${document.originalName} for Tutor answers`}
                                className="mt-0.5 accent-blue-500"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-slate-200">{document.originalName}</p>
                                <p className={`mt-0.5 text-[10px] ${ready ? 'text-emerald-400' : 'text-amber-300'}`}>
                                  {ready
                                    ? 'Indexed · Ready for questions'
                                    : document.needsReindexing
                                      ? 'Re-index required for the current embedding model'
                                      : document.indexingError || 'Not processed yet'}
                                </p>
                              </div>
                              {!ready && (
                                <button
                                  type="button"
                                  onClick={() => handleIndexDocument(document._id)}
                                  disabled={Boolean(indexingDocumentId) || isUploading}
                                  className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-dark-700 disabled:opacity-50"
                                >
                                  {indexingDocumentId === document._id
                                    ? 'Processing'
                                    : document.needsReindexing
                                      ? 'Re-index'
                                      : 'Prepare'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </details>
                {selectedDocuments.map((document) => (
                  <span
                    key={document._id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-blue-900/70 bg-blue-950/30 px-2 py-1 text-[10px] text-blue-200"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="max-w-40 truncate">{document.originalName}</span>
                    <button
                      type="button"
                      onClick={() => toggleDocument(document._id)}
                      aria-label={`Remove ${document.originalName} from selected PDFs`}
                      className="rounded p-0.5 hover:bg-blue-900/50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            {uploadStatus && (
              <p className="pb-2 text-xs text-slate-400" role="status">{uploadStatus}</p>
            )}
            {selectedDocumentIds.length > 0 && (
              <p className="pb-2 text-[11px] text-slate-500">
                Answers will be grounded in the selected PDFs only.
              </p>
            )}
          </div>
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-800 bg-dark-900 p-3 sm:gap-3 sm:px-4 sm:pb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending || isUploading}
              maxLength={4000}
              placeholder="Ask a question, request an explanation, or paste homework problem..."
              className="field-control min-w-0 flex-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm"
            />
            <button
              type="submit"
              disabled={isSending || isUploading || !input.trim()}
              className="button-primary px-3 sm:px-4 py-2.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSending ? 'Sending' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
