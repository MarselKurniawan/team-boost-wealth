import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  formatCurrency,
  Product,
} from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Edit, Trash2, ArrowLeft, TrendingUp, DollarSign, Upload, Image, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const AdminProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    daily_income: "",
    validity: "",
    vip_level: "0",
    image: "",
    description: "",
    category: "reguler",
    promo_price: "",
    promo_daily_income: "",
    promo_validity: "",
    max_per_user: "1",
    term_type: "long",
    stock: "",
    profit_mode: "daily",
  });
  
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getAllProducts();
    setProducts(data);
  };

  const calculateTotalIncome = (dailyIncome: number, validity: number) => dailyIncome * validity;

  const resetForm = () => {
    setFormData({ name: "", price: "", daily_income: "", validity: "", vip_level: "0", image: "", description: "", category: "reguler", promo_price: "", promo_daily_income: "", promo_validity: "", max_per_user: "1", term_type: "long", stock: "", profit_mode: "daily" });
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    resetForm();
    setSelectedProduct(null);


    setPreviewImage("");
    setEditDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setIsCreating(false);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      daily_income: product.daily_income.toString(),
      validity: product.validity.toString(),
      vip_level: product.vip_level.toString(),
      image: product.image || "",
      description: product.description || "",
      category: product.category || "reguler",
      promo_price: product.promo_price?.toString() || "",
      promo_daily_income: product.promo_daily_income?.toString() || "",
      promo_validity: product.promo_validity?.toString() || "",
      max_per_user: product.max_per_user == null ? "0" : product.max_per_user.toString(),
      term_type: (product as any).term_type === 'short' ? 'short' : 'long',
      stock: (product as any).stock == null ? "" : String((product as any).stock),
      profit_mode: (product as any).profit_mode === 'locked' ? 'locked' : 'daily',
    });
    
    setPreviewImage(product.image || "");
    setEditDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Hanya file gambar yang diperbolehkan", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Ukuran file maksimal 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image: publicUrl });
      setPreviewImage(publicUrl);
      
      toast({ title: "Upload Berhasil", description: "Gambar berhasil diupload" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload Gagal", description: "Terjadi kesalahan saat upload gambar", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, image: url });
    setPreviewImage(url);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    const price = parseInt(formData.price);
    const daily_income = parseInt(formData.daily_income);
    const validity = parseInt(formData.validity);

    if (!formData.name || isNaN(price) || isNaN(daily_income) || isNaN(validity)) {
      toast({ title: "Error", description: "Mohon isi semua field dengan benar", variant: "destructive" });
      return;
    }

    const maxPerUserNum = parseInt(formData.max_per_user);
    const productData = {
      name: formData.name,
      price,
      daily_income,
      validity,
      total_income: calculateTotalIncome(daily_income, validity),
      vip_level: parseInt(formData.vip_level),
      image: formData.image || "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop",
      description: formData.description || "Investasi dengan return menarik",
      is_active: true,
      category: formData.category,
      promo_price: formData.promo_price ? parseInt(formData.promo_price) : null,
      promo_daily_income: formData.promo_daily_income ? parseInt(formData.promo_daily_income) : null,
      promo_validity: formData.promo_validity ? parseInt(formData.promo_validity) : null,
      max_per_user: isNaN(maxPerUserNum) || maxPerUserNum <= 0 ? null : maxPerUserNum,
      term_type: formData.term_type === 'short' ? 'short' : 'long',
      stock: formData.stock.trim() === "" ? null : Math.max(0, parseInt(formData.stock) || 0),
      profit_mode: formData.profit_mode === 'locked' ? 'locked' : 'daily',
    } as any;

    if (isCreating) {
      const result = await createProduct(productData);
      if (result) {
        toast({ title: "Produk Ditambahkan", description: `${productData.name} berhasil ditambahkan` });
      }
    } else if (selectedProduct) {
      await updateProduct(selectedProduct.id, productData);
      toast({ title: "Produk Diperbarui", description: `${productData.name} berhasil diperbarui` });
    }

    setEditDialogOpen(false);
    resetForm();
    loadProducts();
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    // Soft delete: nonaktifkan produk supaya user baru tidak bisa membeli,
    // tapi investasi member yang sudah berjalan tetap dapat profit harian sampai kontrak selesai.
    const ok = await updateProduct(selectedProduct.id, { is_active: false });
    if (!ok) {
      toast({ title: "Gagal", description: "Tidak dapat menghapus produk", variant: "destructive" });
      return;
    }
    toast({
      title: "Produk Dinonaktifkan",
      description: `${selectedProduct.name} tidak bisa dibeli lagi. Member yang sudah beli tetap dapat profit sampai kontrak selesai.`,
    });
    setDeleteDialogOpen(false);
    loadProducts();
  };

  const calculatedTotalIncome = parseInt(formData.daily_income) * parseInt(formData.validity) || 0;

  return (
    <div className="space-y-6 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2"><Package className="w-6 h-6 text-primary" /><h1 className="text-2xl font-heading font-bold text-foreground">Kelola Produk</h1></div>
            <p className="text-sm text-muted-foreground mt-1">Tambah, edit, dan hapus produk investasi</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="neon-pulse"><Plus className="w-4 h-4 mr-2" />Tambah</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">Total Produk</p></div><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-success" /><p className="text-xs text-muted-foreground">VIP 0-1</p></div><p className="text-2xl font-bold">{products.filter((p) => p.vip_level <= 1).length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-accent" /><p className="text-xs text-muted-foreground">VIP 2-3</p></div><p className="text-2xl font-bold">{products.filter((p) => p.vip_level >= 2 && p.vip_level <= 3).length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-vip-gold" /><p className="text-xs text-muted-foreground">VIP 4-5</p></div><p className="text-2xl font-bold">{products.filter((p) => p.vip_level >= 4).length}</p></CardContent></Card>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {products.map((product) => (
          <Card key={product.id} className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              <div className="flex gap-4">
                <div className="w-24 h-24 flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 py-3 pr-3">
                  <div className="flex items-start justify-between mb-2">
                    <div><h3 className="font-semibold text-foreground">{product.name}</h3><p className="text-xs text-muted-foreground">{product.description}</p></div>
                     <Badge variant="vip" className="text-xs">VIP {product.vip_level}</Badge>
                     {product.category !== 'reguler' && (
                       <Badge className={product.category === 'promo' ? 'bg-destructive/90 text-destructive-foreground text-[10px] ml-1' : 'bg-vip-gold/90 text-secondary-foreground text-[10px] ml-1'}>
                         {product.category === 'promo' ? '🔥 Promo' : '👑 VIP'}
                       </Badge>
                     )}
                     <Badge className={`text-[10px] ml-1 ${(product as any).term_type === 'short' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'}`}>
                       {(product as any).term_type === 'short' ? '⚡ Jangka Pendek' : '📈 Jangka Panjang'}
                     </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div><p className="text-muted-foreground">Harga</p><p className="font-semibold text-primary">{formatCurrency(product.price)}</p></div>
                    <div><p className="text-muted-foreground">Harian</p><p className="font-semibold text-success">{formatCurrency(product.daily_income)}</p></div>
                    <div><p className="text-muted-foreground">Total</p><p className="font-semibold text-accent">{formatCurrency(product.total_income)}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(product)}><Trash2 className="w-3 h-3 mr-1" />Hapus</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isCreating ? "Tambah Produk Baru" : "Edit Produk"}</DialogTitle><DialogDescription>{isCreating ? "Tambahkan produk investasi baru" : "Perbarui informasi produk"}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nama Produk *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Paket Investasi Pro" /></div>
            <div className="space-y-2"><Label>Harga Investasi (IDR) *</Label><Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="500000" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Penghasilan Harian *</Label><Input type="number" value={formData.daily_income} onChange={(e) => setFormData({ ...formData, daily_income: e.target.value })} placeholder="55000" /></div>
              <div className="space-y-2"><Label>Masa Berlaku (Hari) *</Label><Input type="number" value={formData.validity} onChange={(e) => setFormData({ ...formData, validity: e.target.value })} placeholder="20" /></div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success" /><span className="text-sm text-muted-foreground">Total Penghasilan (otomatis)</span></div><span className="font-bold text-success">{formatCurrency(calculatedTotalIncome)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Level VIP</Label><Select value={formData.vip_level} onValueChange={(value) => setFormData({ ...formData, vip_level: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[0, 1, 2, 3, 4, 5].map((level) => <SelectItem key={level} value={level.toString()}>VIP {level}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Kategori</Label><Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reguler">Reguler</SelectItem><SelectItem value="promo">🔥 Promo</SelectItem><SelectItem value="vip">👑 VIP</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2">
              <Label>Jenis Kontrak (Term)</Label>
              <Select value={formData.term_type} onValueChange={(value) => setFormData({ ...formData, term_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">📈 Jangka Panjang (dihitung untuk syarat naik VIP)</SelectItem>
                  <SelectItem value="short">⚡ Jangka Pendek (TIDAK dihitung untuk syarat naik VIP)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Jangka Panjang = pembelian bawahan menaikkan progres VIP upline. Jangka Pendek = pembelian bawahan tidak berpengaruh ke syarat kenaikan level upline.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Maks. Pembelian per User</Label>
              <Input
                type="number"
                min={0}
                value={formData.max_per_user}
                onChange={(e) => setFormData({ ...formData, max_per_user: e.target.value })}
                placeholder="1"
              />
              <p className="text-[10px] text-muted-foreground">Isi 0 atau kosongkan untuk tanpa batas. Default: 1 (setiap user hanya bisa beli 1 unit produk ini).</p>
            </div>
            <div className="space-y-2">
              <Label>Stok Produk</Label>
              <Input
                type="number"
                min={0}
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="Kosongkan = tak terbatas"
              />
              <p className="text-[10px] text-muted-foreground">Kosongkan untuk stok tak terbatas. Isi 0 untuk menonaktifkan pembelian (habis).</p>
            </div>
            
            {/* Promo Fields */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-dashed border-border">
              <Label className="text-sm font-medium flex items-center gap-1.5">🏷️ Harga Promo <span className="text-xs text-muted-foreground font-normal">(Opsional)</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Harga Promo</Label>
                  <Input type="number" value={formData.promo_price} onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })} placeholder="Kosongkan" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Harian Promo</Label>
                  <Input type="number" value={formData.promo_daily_income} onChange={(e) => setFormData({ ...formData, promo_daily_income: e.target.value })} placeholder="Kosongkan" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Durasi Promo</Label>
                  <Input type="number" value={formData.promo_validity} onChange={(e) => setFormData({ ...formData, promo_validity: e.target.value })} placeholder="Kosongkan" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Kosongkan field yang tidak ingin di-promo. Harga asli akan ditampilkan dengan garis coret.</p>
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Gambar Produk
              </Label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-20 border-dashed flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Klik untuk upload gambar (Max 5MB)</span>
                  </>
                )}
              </Button>

              {/* Image Preview */}
              {previewImage && (
                <div className="relative mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-border">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewImage("")}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Deskripsi produk..." className="min-h-[80px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button><Button onClick={handleSave}>{isCreating ? "Tambah Produk" : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Produk?</DialogTitle><DialogDescription>Apakah Anda yakin ingin menghapus "{selectedProduct?.name}"? Tindakan ini tidak dapat dibatalkan.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button><Button variant="destructive" onClick={handleDelete}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
