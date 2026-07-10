import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getInvestments, getTransactions, formatCurrency, Investment, Transaction } from "@/lib/database";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  TrendingUp,
  PieChartIcon,
  BarChart3,
  Activity,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

const COLORS = ["hsl(192, 75%, 38%)", "hsl(45, 93%, 58%)", "hsl(145, 65%, 45%)", "hsl(25, 95%, 58%)", "hsl(280, 65%, 55%)"];

const Statistics = () => {
  const { user, profile } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadData = async () => {
    if (user) {
      const [invData, txData] = await Promise.all([
        getInvestments(user.id),
        getTransactions(user.id)
      ]);
      setInvestments(invData);
      setTransactions(txData);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const activeInvestments = investments.filter((i) => i.status === "active");
  const totalDailyIncome = activeInvestments.reduce((sum, i) => sum + i.daily_income, 0);
  const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);

  // Calculate income stats from transactions (last 7 days)
  const getIncomeStats = () => {
    const stats: { date: string; income: number; commission: number }[] = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      
      const dayTransactions = transactions.filter(t => {
        const txDate = new Date(t.created_at);
        return txDate.toDateString() === date.toDateString() && t.status === 'success';
      });
      
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const commission = dayTransactions.filter(t => t.type === 'commission').reduce((sum, t) => sum + t.amount, 0);
      
      stats.push({ date: dateStr, income, commission });
    }
    
    return stats;
  };

  // Calculate investment distribution
  const getInvestmentDistribution = () => {
    const distribution: Record<string, number> = {};
    
    investments.forEach(inv => {
      if (!distribution[inv.product_name]) {
        distribution[inv.product_name] = 0;
      }
      distribution[inv.product_name] += inv.amount;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const incomeStats = getIncomeStats();
  const investmentDist = getInvestmentDistribution();

  const monthlyData = [
    { month: "Jan", value: 0 },
    { month: "Feb", value: 0 },
    { month: "Mar", value: 0 },
    { month: "Apr", value: 0 },
    { month: "Mei", value: profile?.total_income || 0 },
  ];

  return (
    <div className="space-y-6 p-4 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-heading font-bold text-foreground mb-1">Statistik</h1>
        <p className="text-[11px] text-muted-foreground">Analisis performa investasi Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Investasi</p>
            </div>
            <p className="text-sm font-bold text-foreground">{formatCurrency(totalInvested)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-to-br from-success/20 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
            </div>
            <p className="text-sm font-bold text-success">{formatCurrency(profile?.total_income || 0)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-success" />
              <p className="text-xs text-muted-foreground">Income Harian</p>
            </div>
            <p className="text-sm font-bold text-foreground">{formatCurrency(totalDailyIncome)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent" />
              <p className="text-xs text-muted-foreground">Komisi Referral</p>
            </div>
            <p className="text-sm font-bold text-accent">{formatCurrency(profile?.team_income || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Income Chart */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Pendapatan 7 Hari Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="income" name="Income" fill="hsl(145, 65%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" name="Komisi" fill="hsl(25, 95%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Investment Distribution */}
      {investmentDist.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Distribusi Investasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investmentDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {investmentDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {investmentDist.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Tren Pendapatan Bulanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(145, 65%, 45%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(145, 65%, 45%)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Investasi Aktif</span>
            <Badge variant="success">{activeInvestments.length} Paket</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total Transaksi</span>
            <span className="font-semibold">{transactions.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">ROI</span>
            <span className="font-semibold text-success">
              {totalInvested > 0 ? `+${(((profile?.total_income || 0) / totalInvested) * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
