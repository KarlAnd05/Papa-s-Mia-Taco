import { useEffect, useRef, useState } from "react";
import { useLocation, Route, Switch, Redirect } from "wouter";
import { useGetStatsOverview } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Users, Receipt, TrendingUp, LogOut, ChevronRight, ShoppingBag, Menu, X, UtensilsCrossed,
  CalendarDays, Calculator, Settings as SettingsIcon, Clock, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useStaffAuthActions, useStaffUser } from "@/hooks/useStaffAuth";
import { apiFetch } from "@/lib/api";
import { money } from "@/lib/format";
import { CustomerList } from "./AdminCustomers";
import { AdminOrdersPage } from "./AdminOrders";
import { AdminMenu } from "./AdminMenu";
import { AdminPOS } from "./AdminPOS";
import { AdminReservations } from "./AdminReservations";
import { AdminSettings } from "./AdminSettings";

type NotificationCounts = {
  newOrders: number;
  latestNewOrderId: number;
  pendingReservations: number;
  latestPendingReservationId: number;
  reservationsToday: number;
};

export default function AdminRouter() {
  const [location] = useLocation();
  const { data: user, isLoading } = useStaffUser();

  // Keep the admin area out of search engines
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = "noindex, nofollow";
    return () => {
      meta!.content = previous;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!user) return <Redirect to={`/admin/login?next=${encodeURIComponent(location)}`} replace />;

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/pos" component={AdminPOS} />
        <Route path="/admin/orders" component={AdminOrdersPage} />
        <Route path="/admin/reservations" component={AdminReservations} />
        <Route path="/admin/menu" component={AdminMenu} />
        <Route path="/admin/customers" component={CustomerList} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route><Redirect to="/admin" /></Route>
      </Switch>
    </AdminLayout>
  );
}

// Short two-note chime made with Web Audio (no sound file needed)
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1318].forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // audio not available — the toast is still shown
  }
}

// Polls for new online orders / reservation requests and alerts staff.
function useAdminNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const seen = useRef<{ order: number; reservation: number } | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => apiFetch<NotificationCounts>("/admin/notifications/counts"),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    const prev = seen.current;
    seen.current = { order: data.latestNewOrderId, reservation: data.latestPendingReservationId };
    if (!prev) return; // first load: nothing is "new" yet

    const newOrder = data.latestNewOrderId > prev.order;
    const newReservation = data.latestPendingReservationId > prev.reservation;
    if (newOrder) {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({
        title: `New online order #${data.latestNewOrderId}`,
        description: "Open Orders to accept it.",
        action: (
          <ToastAction altText="View orders" onClick={() => setLocation("/admin/orders")}>
            View
          </ToastAction>
        ),
      });
    }
    if (newReservation) {
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      if (!newOrder) {
        toast({ title: "New reservation request", description: "Open Reservations to approve it." });
      }
    }
    if (newOrder || newReservation) playChime();
  }, [data, queryClient, toast, setLocation]);

  // Show waiting items in the browser tab title
  useEffect(() => {
    const waiting = (data?.newOrders ?? 0) + (data?.pendingReservations ?? 0);
    document.title = waiting > 0 ? `(${waiting}) PMT Admin` : "PMT Admin";
  }, [data]);

  return data;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useStaffUser();
  const { logout } = useStaffAuthActions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const counts = useAdminNotifications();
  const isPOS = location.startsWith("/admin/pos");

  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  const navBtn = (path: string, label: string, Icon: React.ComponentType<{ className?: string }>, badge?: number) => {
    const active = path === '/admin' ? location === '/admin' : location.startsWith(path);
    return (
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
        onClick={() => navigate(path)}
      >
        <Icon className="w-5 h-5" />
        {label}
        {!!badge && (
          <span className="ml-auto min-w-6 h-6 px-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
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
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Papa's Mia Tacos" width={52} height={48} className="h-12 w-auto" />
            <span className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">Admin</span>
          </div>
          <button className="lg:hidden p-1 text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navBtn('/admin', 'Dashboard', TrendingUp)}
          {navBtn('/admin/pos', 'POS / Cashier', Calculator)}
          {navBtn('/admin/orders', 'Orders', ShoppingBag, counts?.newOrders)}
          {navBtn('/admin/reservations', 'Reservations', CalendarDays, counts?.pendingReservations)}
          {navBtn('/admin/menu', 'Menu & Pricing', UtensilsCrossed)}
          {navBtn('/admin/customers', 'Customers', Users)}
          {navBtn('/admin/settings', 'Settings', SettingsIcon)}
        </div>

        <div className="p-4 border-t border-border">
          {user && (
            <p className="px-4 pb-2 text-xs text-muted-foreground truncate">
              Signed in as <span className="font-semibold text-foreground">{user.displayName}</span>
            </p>
          )}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={async () => {
              await logout();
              setLocation('/admin/login');
            }}
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
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Papa's Mia Tacos" width={43} height={40} className="h-10 w-auto" />
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Admin</span>
          </div>
          <button
            className="relative p-2 rounded-lg text-muted-foreground"
            onClick={() => navigate((counts?.newOrders ?? 0) > 0 ? '/admin/orders' : '/admin/reservations')}
            aria-label="Waiting orders and reservations"
          >
            <Bell className="w-5 h-5" />
            {((counts?.newOrders ?? 0) + (counts?.pendingReservations ?? 0)) > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-secondary" />
            )}
          </button>
        </div>

        <main className={`flex-1 overflow-y-auto bg-background ${isPOS ? 'p-2 md:p-4' : 'p-4 md:p-8'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

type TodayStats = {
  date: string;
  salesToday: number;
  completedOrdersToday: number;
  ordersToday: number;
  ordersWaiting: number;
  ordersInProgress: number;
  reservationsToday: number;
  guestsToday: number;
  pendingReservations: number;
};

function AdminDashboard() {
  const { data: stats, isLoading } = useGetStatsOverview();
  const { data: today } = useQuery({
    queryKey: ["admin-stats-today"],
    queryFn: () => apiFetch<TodayStats>("/stats/today"),
    refetchInterval: 30_000,
  });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Overview of restaurant performance and customer base.</p>
        </div>
        <Button onClick={() => setLocation('/admin/pos')} className="h-11">
          <Calculator className="w-4 h-4 mr-2" /> Open POS
        </Button>
      </div>

      {/* Today */}
      {today && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Today</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Sales today"
              value={money(today.salesToday)}
              icon={<Receipt className="w-5 h-5 text-primary" />}
              trend={`${today.completedOrdersToday} completed orders`}
            />
            <StatCard
              title="Orders waiting"
              value={today.ordersWaiting.toString()}
              icon={<Bell className="w-5 h-5 text-primary" />}
              trend={`${today.ordersInProgress} in progress · ${today.ordersToday} today`}
              highlight={today.ordersWaiting > 0}
              onClick={() => setLocation('/admin/orders')}
            />
            <StatCard
              title="Reservation requests"
              value={today.pendingReservations.toString()}
              icon={<Clock className="w-5 h-5 text-primary" />}
              trend="Waiting for approval"
              highlight={today.pendingReservations > 0}
              onClick={() => setLocation('/admin/reservations')}
            />
            <StatCard
              title="Booked today"
              value={`${today.guestsToday} guests`}
              icon={<CalendarDays className="w-5 h-5 text-primary" />}
              trend={`${today.reservationsToday} confirmed reservations`}
              onClick={() => setLocation('/admin/reservations')}
            />
          </div>
        </div>
      )}

      {/* All-time */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Customers (all time)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={<Receipt className="w-5 h-5 text-primary" />}
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
          />
          <StatCard
            title="Active VIPs"
            value={stats.vipCustomers.toLocaleString()}
            icon={<div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">VIP</div>}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Loyalty Tiers</CardTitle>
            <CardDescription>Breakdown of customers by loyalty status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TierRow name="Platinum" count={stats.loyaltyTierBreakdown.platinum} total={stats.totalCustomers} color="bg-slate-500" />
              <TierRow name="Gold" count={stats.loyaltyTierBreakdown.gold} total={stats.totalCustomers} color="bg-yellow-500" />
              <TierRow name="Silver" count={stats.loyaltyTierBreakdown.silver} total={stats.totalCustomers} color="bg-slate-400" />
              <TierRow name="Bronze" count={stats.loyaltyTierBreakdown.bronze} total={stats.totalCustomers} color="bg-amber-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Customer Value</CardTitle>
            <CardDescription>Averages across your customer base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold text-foreground">${stats.avgOrderValue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm text-muted-foreground">New Customers (This Month)</p>
                  <p className="text-2xl font-bold text-foreground">{stats.newCustomersThisMonth}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setLocation('/admin/customers')}>
                  Customers <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon, trend, highlight, onClick,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border-border bg-card overflow-hidden ${onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''} ${highlight ? 'border-secondary border-2' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className={`text-2xl md:text-3xl font-bold ${highlight ? 'text-secondary' : 'text-foreground'}`}>{value}</h3>
          {trend && <p className="text-xs font-medium text-muted-foreground">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function TierRow({ name, count, total, color }: { name: string; count: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 text-sm font-medium">{name}</div>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
      <div className="w-16 text-right text-sm text-muted-foreground">{count} ({percent}%)</div>
    </div>
  );
}
