import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import {
  deleteKnowledgeDocument,
  fetchKnowledgeDocuments,
  uploadKnowledgeDocument,
  type KnowledgeDocumentApi,
} from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { KnowledgeDocument } from '../../types';

const docIcons: Record<string, string> = {
  pdf: 'PDF',
  faq: 'FAQ',
  docx: 'DOC',
  text: 'TXT',
};

function mapDocument(doc: KnowledgeDocumentApi): KnowledgeDocument {
  return {
    id: String(doc.id),
    title: doc.title,
    docType: doc.doc_type,
    status: doc.status,
    uploadedBy: doc.uploaded_by,
    pageCount: doc.page_count ?? undefined,
    chunkCount: doc.chunk_count,
    createdAt: doc.created_at,
  };
}

export function KnowledgeBasePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchKnowledgeDocuments();
      setDocuments(data.map(mapDocument));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        await uploadKnowledgeDocument(file);
      }
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteKnowledgeDocument(Number(id));
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500">Documents for RAG — upload PDFs, FAQs, and docs</p>
          <p className="mt-1 text-xs text-slate-400">API: POST /api/me/knowledge/documents/</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.md"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
          dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-slate-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-2 font-medium text-slate-600">Drag & drop files here</p>
        <p className="text-sm text-slate-400">PDF, DOCX, TXT — uploaded to backend media storage</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading documents...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">
                  {docIcons[doc.docType]}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-slate-900">{doc.title}</h3>
                  <p className="text-xs text-slate-400">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge label={doc.status} variant="doc" value={doc.status} />
                    {doc.chunkCount != null && (
                      <span className="text-xs text-slate-400">{doc.chunkCount} chunks</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-slate-300 hover:text-red-500"
                  onClick={() => handleDelete(doc.id)}
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
          {!documents.length && (
            <p className="col-span-full text-sm text-slate-400">No documents yet. Upload your first file.</p>
          )}
        </div>
      )}
    </div>
  );
}
