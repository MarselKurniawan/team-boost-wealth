import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, TrendingUp, Calendar, Percent } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions, formatCurrency, Transaction } from "@/lib/database";

const CommissionHistory = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setIsLoading(true);
        const txData = await getTransactions(user.id);
        // Filter only commission and rabat transactions
        const referralTx = txData.filter(t => t.type === 'commission' || t.type === 'rabat');
        setTransactions(referralTx);
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const commissionTransactions = transactions.filter(t => t.type === 'commission');
  const rabatTransactions = transactions.filter(t => t.type === 'rabat');

  const totalCommission = commissionTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalRabat = rabatTransactions.reduce((sum, t) => sum + t.amount, 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TransactionItem = ({ tx }: { tx: Transaction }) => (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          tx.type === 'commission' ? 'bg-success/20' : 'bg-accent/20'
        }`}>
          {tx.type === 'commission' ? (
            <Users className="w-5 h-5 text-success" />
          ) : (
            <TrendingUp className="w-5 h-5 text-accent" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{tx.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${tx.type === 'commission' ? 'text-success' : 'text-accent'}`}>
          +{formatCurrency(tx.amount)}
        </p>
        <Badge variant={tx.type === 'commission' ? 'success' : 'outline'} className="text-xs">
          {tx.type === 'commission' ? 'Komisi' : 'Rabat'}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-heading font-bold text-foreground">Riwayat Komisi & Rabat</h1>
          <p className="text-[11px] text-muted-foreground">Detail penghasilan dari tim Anda</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-success/20 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-success" />
              <p className="text-xs font-medium text-muted-foreground">Total Komisi</p>
            </div>
            <p className="text-sm font-bold text-success">{formatCurrency(profile?.team_income || totalCommission)}</p>
            <p className="text-xs text-muted-foreground mt-1">{commissionTransactions.length} transaksi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-accent" />
              <p className="text-xs font-medium text-muted-foreground">Total Rabat</p>
            </div>
            <p className="text-sm font-bold text-accent">{formatCurrency(profile?.rabat_income || totalRabat)}</p>
            <p className="text-xs text-muted-foreground mt-1">{rabatTransactions.length} transaksi</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Cara Mendapatkan Penghasilan</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                <strong>Komisi:</strong> Didapat saat bawahan membeli produk (2-10% dari harga).<br/>
                <strong>Rabat:</strong> Didapat setiap hari dari profit bawahan (2-5% dari profit harian).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="all" className="text-xs">Semua ({transactions.length})</TabsTrigger>
              <TabsTrigger value="commission" className="text-xs">Komisi ({commissionTransactions.length})</TabsTrigger>
              <TabsTrigger value="rabat" className="text-xs">Rabat ({rabatTransactions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Memuat data...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada penghasilan dari tim</p>
                  <p className="text-xs text-muted-foreground mt-1">Undang teman untuk mulai mendapatkan komisi & rabat</p>
                </div>
              ) : (
                transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
              )}
            </TabsContent>

            <TabsContent value="commission" className="space-y-3">
              {commissionTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada komisi</p>
                  <p className="text-xs text-muted-foreground mt-1">Komisi didapat saat bawahan membeli produk</p>
                </div>
              ) : (
                commissionTransactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
              )}
            </TabsContent>

            <TabsContent value="rabat" className="space-y-3">
              {rabatTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Percent className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada rabat</p>
                  <p className="text-xs text-muted-foreground mt-1">Rabat didapat dari profit harian bawahan</p>
                </div>
              ) : (
                rabatTransactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionHistory;
