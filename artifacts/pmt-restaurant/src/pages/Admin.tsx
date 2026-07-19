import { useLocation, Route, Switch } from "wouter";
import { Show } from "@clerk/react";
import { useGetAdminMe, useGetStatsOverview, getGetAdminMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Receipt, TrendingUp, AlertTriangle, LogOut, ChevronRight, ShoppingBag, Menu, X } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CustomerList } from "./AdminCustomers";
import { AdminOrdersPage } from "./AdminOrders";

export default function AdminRouter() {
  const [, setLocation] = useLocation();

  return (
    <Show 
      when="signed-in" 
      fallback={<div className="h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>}
    >
      <AdminGuard>
        <AdminLayout>
          <Switch>
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/customers" component={CustomerList} />
            <Route path="/admin/orders" component={AdminOrdersPage} />
          </Switch>
        </AdminLayout>
      </AdminGuard>
    </Show>
  );
}

// Ensure the user is an admin
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: adminMe, isLoading, error } = useGetAdminMe({
    query: {
      retry: false,
      queryKey: getGetAdminMeQueryKey(),
    }
  });

  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const { user } = useUser();
  const queryClient = useQueryClient();

  const handleClaim = async () => {
    if (!user) return;
    setClaiming(true);
    setClaimError("");
    
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: user.primaryEmailAddress?.emailAddress, 
          name: user.fullName 
        })
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to claim admin access");
      }
      
      // Invalidate the query to trigger a reload of admin status
      await queryClient.invalidateQueries({ queryKey: getGetAdminMeQueryKey() });
    } catch (err: any) {
      setClaimError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  // Not an admin or errored out
  if (error || !adminMe?.isAdmin) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-serif">Admin Access Required</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account doesn't have admin access yet. Claim it now (up to 2 admin accounts allowed).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {claimError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 border border-destructive/20">
                {claimError}
              </div>
            )}
            <Button 
              className="w-full h-12 text-base font-bold" 
              onClick={handleClaim}
              disabled={claiming}
            >
              {claiming ? <Loader2 className="animate-spin mr-2" /> : null}
              Claim Admin Access
            </Button>
            <div className="mt-6 text-center">
              <Button variant="link" className="text-muted-foreground" onClick={() => window.location.href = '/'}>
                Return to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  const navBtn = (path: string, label: string, Icon: any) => {
    const active = path === '/admin' ? location === '/admin' : location.startsWith(path);
    return (
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
        }`}
        onClick={() => navigate(path)}
      >
        <Icon className="w-5 h-5" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 border-r border-border bg-card flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="font-serif text-2xl font-bold tracking-tighter text-primary">
            PMT <span className="text-sm font-sans text-muted-foreground ml-2 font-normal uppercase tracking-widest">Admin</span>
          </div>
          <button className="lg:hidden p-1 text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navBtn('/admin', 'Dashboard', TrendingUp)}
          {navBtn('/admin/customers', 'Customers', Users)}
          {navBtn('/admin/orders', 'Orders', ShoppingBag)}
        </div>

        <div className="p-4 border-t border-border">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => signOut({ redirectUrl: '/' })}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-serif text-xl font-bold text-primary">PMT Admin</div>
          <div className="w-9" /> {/* spacer */}
        </div>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading } = useGetStatsOverview();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-white mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Overview of restaurant performance and customer base.</p>
        </div>
        <Button onClick={() => setLocation('/admin/customers')}>
          Manage Customers <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          icon={<Receipt className="w-5 h-5 text-primary" />} 
          trend="+12% from last month"
          trendUp
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders.toLocaleString()} 
          icon={<TrendingUp className="w-5 h-5 text-primary" />} 
        />
        <StatCard 
          title="Total Customers" 
          value={stats.totalCustomers.toLocaleString()} 
          icon={<Users className="w-5 h-5 text-primary" />} 
          trend={`+${stats.newCustomersThisMonth} this month`}
          trendUp
        />
        <StatCard 
          title="Active VIPs" 
          value={stats.vipCustomers.toLocaleString()} 
          icon={<div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">VIP</div>} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Loyalty Tiers</CardTitle>
            <CardDescription>Breakdown of customers by loyalty status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TierRow name="Platinum" count={stats.loyaltyTierBreakdown.platinum} total={stats.totalCustomers} color="bg-slate-300" />
              <TierRow name="Gold" count={stats.loyaltyTierBreakdown.gold} total={stats.totalCustomers} color="bg-yellow-500" />
              <TierRow name="Silver" count={stats.loyaltyTierBreakdown.silver} total={stats.totalCustomers} color="bg-slate-400" />
              <TierRow name="Bronze" count={stats.loyaltyTierBreakdown.bronze} total={stats.totalCustomers} color="bg-amber-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest metrics across the business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/5">
                <div>
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold text-white">${stats.avgOrderValue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/5">
                <div>
                  <p className="text-sm text-muted-foreground">New Customers (This Month)</p>
                  <p className="text-2xl font-bold text-white">{stats.newCustomersThisMonth}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendUp }: any) {
  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-3xl font-bold text-white">{value}</h3>
          {trend && (
            <p className={`text-xs font-medium ${trendUp ? 'text-green-500' : 'text-muted-foreground'}`}>
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TierRow({ name, count, total, color }: any) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 text-sm font-medium">{name}</div>
      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
      <div className="w-16 text-right text-sm text-muted-foreground">{count} ({percent}%)</div>
    </div>
  );
}