# Study-material RAG setup

The AI Tutor defaults to local `Xenova/all-MiniLM-L6-v2` embeddings through Transformers.js. Document chunks and student questions use the same provider, model, dimensions, and local pooling/normalization settings; indexing and retrieval therefore do not consume Gemini embedding quota. The model runs on CPU and its files are downloaded the first time the backend loads it. Gemini indexing and retrieval likewise share `gemini-embedding-001` with 768 dimensions and use the corresponding `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` task types.

Configure the provider in the backend environment:

```dotenv
RAG_EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
# Optional; defaults to a backend-specific directory under the OS temp folder.
TRANSFORMERS_CACHE_DIR=
```

Only compatible 384-dimensional local models can replace the default model. To use the legacy Gemini embedding provider instead, set `RAG_EMBEDDING_PROVIDER=gemini` and configure `GEMINI_API_KEY`. Gemini embeddings use 768 dimensions and require available Gemini quota.

Local vectors are stored separately in `studyMaterialChunksLocal` and searched with the Atlas Vector Search index `study_material_local_vector_index`. Existing 768-dimensional Gemini vectors in `studyMaterialChunks` and their `study_material_vector_index` are preserved until a document is successfully re-indexed with the selected provider; the two vector spaces are never mixed. Documents record their provider, model, and dimensions. Older `ready` records are migrated to `indexed`, while records whose embeddings do not match the active configuration become `pending` and expose a Re-index action in Study Materials and the AI Tutor.

## Create the Atlas index

With the backend environment configured for the target Atlas cluster, create the index for the selected embedding provider:

```powershell
cd backend
npm run create:study-material-vector-index
```

For the default local provider this creates `study_material_local_vector_index` on `studyMaterialChunksLocal`; with the Gemini provider it creates `study_material_vector_index` on `studyMaterialChunks`. Run the command once for each provider whose index is needed, changing `RAG_EMBEDDING_PROVIDER` between runs. The MongoDB database user needs permission to list and create Atlas Search indexes. The script waits until Atlas reports the index as queryable. Each index includes `studentId` and `documentId` filter fields so retrieval is constrained to the authenticated student and the documents selected in chat.

The index is not created automatically at application startup. This avoids requiring index-administration privileges for normal application traffic.

## Upload and retrieval behavior

`POST /api/study-materials` accepts the existing multipart `file` field and an optional `subjectId`. It checks the PDF signature, extracts selectable text, and renders pages with insufficient text using `pdf-parse`'s existing PDF.js/native-canvas dependencies. Those page images are read locally by Tesseract.js with the bundled English model; OCR does not call Gemini. Extracted and OCR text are merged in page order, and both the flattened text and `{ pageNumber, text }` page records are saved for citations. The original PDF is saved to the existing `studyMaterials` GridFS bucket before AI indexing begins.

Uploads remain limited to 10 MB and 500 pages. The Study Materials and AI Tutor clients use the existing `POST /api/study-materials/:documentId/index` route to re-index: it retrieves the original PDF from the existing `studyMaterials` GridFS bucket, re-extracts selectable/OCR text, refreshes the saved page text, and replaces the document's chunk embeddings. Chunk updates are keyed by owner, document, and chunk index; retries do not duplicate chunks. Indexing errors do not discard the PDF, metadata, or extracted text, and failed Gemini quota/rate-limit errors return actionable messages while leaving the document available for a later retry. The per-document lifecycle is `pending`, `processing`, `indexed`, or `failed`. With local embeddings, missing Gemini credentials or exhausted Gemini quota do not prevent indexing. The Tesseract.js English model is installed with the backend dependencies, so scanned-page OCR does not require Gemini or an external model download. No temporary PDF files are written; upload bytes and rendered OCR pages are processed in memory.

`POST /api/ai/chat` accepts `{ message, history, documentIds }`. The existing non-RAG Tutor flow remains in use when `documentIds` is empty. With selected documents, the API verifies ownership and indexed status, checks the stored embedding configuration against the active provider, embeds the current question with that same configuration, and performs a filtered Atlas `$vectorSearch`. If a selected document needs re-indexing, the response names it and the AI Tutor offers the Re-index action. Gemini generates a grounded answer using only the retrieved excerpts, and the response includes source document names and page numbers. If Gemini is unavailable after retrieval, the Tutor returns up to five sufficiently relevant excerpts with citations, favoring coverage across matched selected documents. If no chunks are retrieved or the best Atlas score is below the local fallback relevance threshold, the API clearly says it could not find enough information and does not present unrelated excerpts as an answer. Gemini-generated responses still use the model's grounded-context check.

Only student-owned documents can be indexed, selected, retrieved, viewed, or deleted. If page rendering or OCR fails, processing returns a clear error and the saved PDF can be reprocessed. A PDF with no readable text after OCR is rejected; low-quality handwriting or unsupported visual layouts may not OCR accurately.

## Integration verification

The real MongoDB/GridFS integration test is opt-in to avoid writing test files to a configured database during the normal test suite. It creates uniquely identified PDF records and removes them after the run. From the backend directory, run:

```powershell
try {
  $env:STUDY_MATERIAL_INTEGRATION = '1'
  node --test tests/studyMaterial.integration.test.js
} finally {
  Remove-Item Env:\STUDY_MATERIAL_INTEGRATION -ErrorAction SilentlyContinue
}
```

The test requires `MONGODB_URI` and a queryable `study_material_local_vector_index` on Atlas. It creates real student accounts and PDFs, verifies GridFS persistence/re-login/ownership, verifies re-indexing restores extracted text from the original PDF without duplicating chunks, indexes text and OCR pages using local embeddings with `GEMINI_API_KEY` cleared, runs owner-filtered vector queries, and checks the Tutor's cited-excerpt fallback. If Gemini credentials are configured, it also attempts Gemini embedding and answer retrieval; that optional subtest can be skipped if Gemini quota or the Atlas index is unavailable.
