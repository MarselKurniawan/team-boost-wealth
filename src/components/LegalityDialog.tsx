import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShieldCheck, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LegalityDoc {
  id: string;
  title: string;
  document_number: string;
  description: string;
  image_url: string;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusStyle = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("aktif") || s.includes("valid") || s.includes("active") || s.includes("verified"))
    return "bg-emerald-100 text-emerald-700";
  if (s.includes("proses") || s.includes("pending")) return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

const LegalityDialog = ({ open, onOpenChange }: Props) => {
  const [docs, setDocs] = useState<LegalityDoc[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("company_legality")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setDocs(data as any);
      });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden rounded-[24px] border-slate-200 bg-white max-h-[90vh] overflow-y-auto">
        {/* Clean Badge Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-slate-800">Legalitas</h1>
              <p className="text-[10px] text-slate-400">{docs.length} Dokumen Terverifikasi</p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="p-4 bg-[#f0f4fb]">
          {docs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-[11px] text-slate-400">Belum ada dokumen legalitas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => doc.image_url && setPreview(doc.image_url)}
                  className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col gap-3 text-left hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <FileText className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${statusStyle(
                        doc.status
                      )}`}
                    >
                      {doc.status || "Aktif"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-700 leading-tight mb-0.5 break-words">
                      {doc.title}
                    </p>
                    {doc.document_number && (
                      <p className="text-[9px] text-slate-400 font-mono break-all">
                        {doc.document_number}
                      </p>
                    )}
                    {doc.description && (
                      <p className="text-[9px] text-slate-500 mt-1 leading-snug break-words">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer trust bar */}
          <div className="mt-4 bg-[#1e3a8a] rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] text-blue-200 uppercase font-bold tracking-wider">
                Status Kepatuhan
              </p>
              <p className="text-[10px] text-white font-medium leading-tight">
                Seluruh dokumen sah & sesuai peraturan yang berlaku.
              </p>
            </div>
          </div>
        </div>

        {/* Image preview overlay */}
        {preview && (
          <div
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white"
              onClick={() => setPreview(null)}
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={preview}
              alt="Dokumen"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LegalityDialog;
