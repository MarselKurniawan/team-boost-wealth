import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";

interface Reward {
  id?: string;
  label: string;
  amount: number;
  weight: number; // stored as percentage (0-100)
  fill: string;
  sort_order: number;
  is_active: boolean;
}

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const DEFAULT_FILL = "#10b981";

// Convert "hsl(217 90% 58%)" or hex to a hex string for the color input.
const toHex = (c: string): string => {
  if (!c) return DEFAULT_FILL;
  if (c.startsWith("#")) return c;
  const m = c.match(/hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/i);
  if (!m) return DEFAULT_FILL;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHexChan = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHexChan(r)}${toHexChan(g)}${toHexChan(b)}`;
};

const SpinSettingsDialog = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("spin_rewards").select("*").order("sort_order");
    setRewards((data as any[] || []).map(r => ({
      ...r,
      amount: Number(r.amount),
      weight: Number(r.weight),
      fill: toHex(r.fill),
    })));
  };

  useEffect(() => { if (open) load(); }, [open]);

  const totalPct = rewards.reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const isValidTotal = Math.abs(totalPct - 100) < 0.01;

  const updateRow = (idx: number, patch: Partial<Reward>) => {
    setRewards(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const addRow = () => {
    if (rewards.length >= 3) {
      toast({ title: "Maksimal 3 Hadiah", description: "Kotak kejutan hanya boleh berisi 3 hadiah.", variant: "destructive" });
      return;
    }
    setRewards(prev => [...prev, {
      label: "Baru", amount: 0, weight: 0, fill: DEFAULT_FILL, sort_order: prev.length + 1, is_active: true
    }]);
  };

  const removeRow = async (idx: number) => {
    const row = rewards[idx];
    if (row.id) await supabase.from("spin_rewards").delete().eq("id", row.id);
    setRewards(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!isValidTotal) {
      toast({ title: "Total Persentase Salah", description: `Total persentase harus 100% (sekarang ${totalPct.toFixed(1)}%)`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < rewards.length; i++) {
        const r = rewards[i];
        const payload = {
          label: r.label,
          amount: r.amount,
          weight: r.weight, // percentage stored directly as weight
          fill: r.fill || DEFAULT_FILL,
          sort_order: i + 1,
          is_active: r.is_active ?? true,
        };
        if (r.id) await supabase.from("spin_rewards").update(payload).eq("id", r.id);
        else await supabase.from("spin_rewards").insert(payload);
      }
      toast({ title: "Tersimpan", description: "Setting roda putar berhasil diperbarui" });
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
             Setting Hadiah Buka Kotak
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Label = nama hadiah. Hadiah = nominal saldo (isi 0 untuk hadiah non-saldo). Total persentase harus 100%.
          </DialogDescription>
        </DialogHeader>


        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {rewards.map((r, i) => (
              <div key={r.id || i} className="border rounded-lg p-2 space-y-2 bg-card">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label className="text-[10px]">Label</Label>
                    <Input className="h-8 text-xs" value={r.label} onChange={e => updateRow(i, { label: e.target.value })} placeholder="10K / Handphone" />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-[10px]">Hadiah Saldo (Rp)</Label>
                    <Input className="h-8 text-xs" type="number" value={r.amount} onChange={e => updateRow(i, { amount: parseFloat(e.target.value) || 0 })} placeholder="0" />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-[10px]">Peluang (%)</Label>
                    <Input className="h-8 text-xs" type="number" step="0.1" min="0" max="100" value={r.weight} onChange={e => updateRow(i, { weight: parseFloat(e.target.value) || 0 })} placeholder="10" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Warna:</Label>
                  <input
                    type="color"
                    value={r.fill}
                    onChange={e => updateRow(i, { fill: e.target.value })}
                    className="h-8 w-12 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono flex-1">{r.fill}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={addRow} disabled={rewards.length >= 3}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Hadiah {rewards.length >= 3 ? "(maks 3)" : `(${rewards.length}/3)`}
            </Button>
            <p className={`text-[11px] text-center font-semibold ${isValidTotal ? "text-success" : "text-destructive"}`}>
              Total Persentase: {totalPct.toFixed(1)}% {isValidTotal ? "✓" : "(harus 100%)"}
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
          <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SpinSettingsDialog;
