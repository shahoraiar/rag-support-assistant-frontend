import { Upload, Trash2 } from 'lucide-react';
import { mockDocuments } from '../../data/mockData';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const docIcons: Record<string, string> = {
  pdf: 'PDF',
  faq: 'FAQ',
  docx: 'DOC',
  text: 'TXT',
};

export function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500">Documents for RAG — upload PDFs, FAQs, and docs</p>
        </div>
        <Button><Upload className="h-4 w-4" /> Upload Document</Button>
      </div>

      {/* Upload zone (demo) */}
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Upload className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-2 font-medium text-slate-600">Drag & drop files here</p>
        <p className="text-sm text-slate-400">PDF, DOCX, FAQ text — processed by Celery (backend later)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockDocuments.map((doc) => (
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
                  {doc.chunkCount && <span className="text-xs text-slate-400">{doc.chunkCount} chunks</span>}
                </div>
              </div>
              <button className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
