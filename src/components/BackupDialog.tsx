import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { exportToJSON, exportToCSV, formatDateForFilename } from "@/lib/exportUtils";
import {
  getAllProfiles,
  getAllTransactions,
  getAllInvestments,
  getAllProducts,
  getCoupons,
  Profile,
  Transaction,
  Investment,
  Product,
  Coupon,
} from "@/lib/database";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Users,
  Receipt,
  TrendingUp,
  Package,
  Ticket,
  Loader2,
  CheckCircle,
  Database,
} from "lucide-react";

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DataType = "profiles" | "transactions" | "investments" | "products" | "coupons" | "all";

const DATA_OPTIONS = [
  { type: "profiles" as DataType, label: "Users", icon: Users, description: "Data profil pengguna" },
  { type: "transactions" as DataType, label: "Transaksi", icon: Receipt, description: "Riwayat transaksi" },
  { type: "investments" as DataType, label: "Investasi", icon: TrendingUp, description: "Data investasi aktif" },
  { type: "products" as DataType, label: "Produk", icon: Package, description: "Daftar produk" },
  { type: "coupons" as DataType, label: "Kupon", icon: Ticket, description: "Data kupon" },
];

const BackupDialog = ({ open, onOpenChange }: BackupDialogProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportedItems, setExportedItems] = useState<string[]>([]);

  const fetchData = async (dataType: DataType): Promise<object[]> => {
    switch (dataType) {
      case "profiles":
        return await getAllProfiles();
      case "transactions":
        return await getAllTransactions();
      case "investments":
        return await getAllInvestments();
      case "products":
        return await getAllProducts();
      case "coupons":
        return await getCoupons();
      default:
        return [];
    }
  };

  const handleExport = async (dataType: DataType, format: "json" | "csv") => {
    const key = `${dataType}-${format}`;
    setIsExporting(key);

    try {
      const dateStr = formatDateForFilename();
      
      if (dataType === "all") {
        // Export all data
        const [profiles, transactions, investments, products, coupons] = await Promise.all([
          getAllProfiles(),
          getAllTransactions(),
          getAllInvestments(),
          getAllProducts(),
          getCoupons(),
        ]);

        if (format === "json") {
          const allData = { profiles, transactions, investments, products, coupons, exportedAt: new Date().toISOString() };
          exportToJSON([allData], `backup_all_${dateStr}`);
        } else {
          // For CSV, export each table separately
          if (profiles.length) exportToCSV(profiles, `backup_profiles_${dateStr}`);
          if (transactions.length) exportToCSV(transactions, `backup_transactions_${dateStr}`);
          if (investments.length) exportToCSV(investments, `backup_investments_${dateStr}`);
          if (products.length) exportToCSV(products, `backup_products_${dateStr}`);
          if (coupons.length) exportToCSV(coupons, `backup_coupons_${dateStr}`);
        }

        toast({
          title: "Backup Berhasil",
          description: `Semua data telah diexport ke ${format.toUpperCase()}`,
        });
      } else {
        const data = await fetchData(dataType);
        const filename = `backup_${dataType}_${dateStr}`;

        if (data.length === 0) {
          toast({
            title: "Tidak Ada Data",
            description: `Tidak ada data ${dataType} untuk diexport`,
            variant: "destructive",
          });
          setIsExporting(null);
          return;
        }

        if (format === "json") {
          exportToJSON(data, filename);
        } else {
          exportToCSV(data, filename);
        }

        toast({
          title: "Export Berhasil",
          description: `${data.length} records diexport ke ${filename}.${format}`,
        });
      }

      setExportedItems((prev) => [...prev, key]);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Gagal",
        description: "Terjadi kesalahan saat mengexport data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setExportedItems([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Database className="w-5 h-5 text-primary" />
            Backup Data
          </DialogTitle>
          <DialogDescription className="text-sm">
            Export data ke file JSON atau CSV untuk backup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export All */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Export Semua Data</h3>
                  <p className="text-xs text-muted-foreground">Backup lengkap semua tabel</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleExport("all", "json")}
                  disabled={isExporting !== null}
                >
                  {isExporting === "all-json" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : exportedItems.includes("all-json") ? (
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                  ) : (
                    <FileJson className="w-4 h-4 mr-2" />
                  )}
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleExport("all", "csv")}
                  disabled={isExporting !== null}
                >
                  {isExporting === "all-csv" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : exportedItems.includes("all-csv") ? (
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  )}
                  CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Individual Tables */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Atau pilih per tabel:</h4>
            {DATA_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.type} className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{option.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleExport(option.type, "json")}
                          disabled={isExporting !== null}
                          title="Export JSON"
                        >
                          {isExporting === `${option.type}-json` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : exportedItems.includes(`${option.type}-json`) ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <FileJson className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleExport(option.type, "csv")}
                          disabled={isExporting !== null}
                          title="Export CSV"
                        >
                          {isExporting === `${option.type}-csv` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : exportedItems.includes(`${option.type}-csv`) ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackupDialog;
