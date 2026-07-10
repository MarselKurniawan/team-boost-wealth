import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";

interface Doc {
  id?: string;
  title: string;
  document_number: string;
  description: string;
  image_url: string;
  status: string;
  sort_order: number;
}

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const LegalityDialog = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const load = async () => {
    const { data } = await supabase.from("company_legality").select("*").order("sort_order");
    setDocs((data as any) || []);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const updateRow = (idx: number, patch: Partial<Doc>) => {
    setDocs(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const addRow = () => {
    setDocs(prev => [...prev, {
      title: "Dokumen Baru", document_number: "", description: "",
      image_url: "", status: "Aktif", sort_order: prev.length + 1
    }]);
  };

  const removeRow = async (idx: number) => {
    const row = docs[idx];
    if (row.id) await supabase.from("company_legality").delete().eq("id", row.id);
    setDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("legality").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("legality").getPublicUrl(path);
      updateRow(idx, { image_url: data.publicUrl });
      toast({ title: "Upload sukses" });
    } catch (e: any) {
      toast({ title: "Gagal upload", description: e.message, variant: "destructive" });
    } finally {
      setUploadingIdx(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const payload = {
          title: d.title, document_number: d.document_number, description: d.description,
          image_url: d.image_url, status: d.status, sort_order: i + 1
        };
        if (d.id) await supabase.from("company_legality").update(payload).eq("id", d.id);
        else await supabase.from("company_legality").insert(payload);
      }
      toast({ title: "Tersimpan", description: "Legalitas perusahaan diperbarui" });
      load();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-success" /> Sertifikat & Legalitas
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Upload dokumen legalitas, izin, & sertifikat perusahaan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="space-y-3">
            {docs.map((d, i) => (
              <div key={d.id || i} className="border rounded-lg p-3 space-y-2 bg-card">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Judul</Label>
                    <Input className="h-8 text-xs" value={d.title} onChange={e => updateRow(i, { title: e.target.value })} placeholder="NIB / NPWP / SK" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Status</Label>
                    <Input className="h-8 text-xs" value={d.status} onChange={e => updateRow(i, { status: e.target.value })} placeholder="Aktif / Valid" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Nomor Dokumen</Label>
                  <Input className="h-8 text-xs" value={d.document_number} onChange={e => updateRow(i, { document_number: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[10px]">Deskripsi</Label>
                  <Textarea className="text-xs min-h-[60px]" value={d.description} onChange={e => updateRow(i, { description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">Gambar / Sertifikat</Label>
                  {d.image_url && (
                    <img src={d.image_url} alt={d.title} className="w-full max-h-40 object-contain rounded border" />
                  )}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(i, e.target.files[0])} />
                      <div className="flex items-center justify-center gap-1 h-8 border rounded text-xs cursor-pointer hover:bg-muted">
                        {uploadingIdx === i ? "Uploading..." : (<><Upload className="w-3 h-3" /> Upload Gambar</>)}
                      </div>
                    </label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={addRow}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Dokumen
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Tutup</Button>
          <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LegalityDialog;
