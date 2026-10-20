import { useState, useEffect } from "react";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Customer, CustomerInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Eye, X, Phone, Mail, MapPin, Calendar, Star, ShoppingBag, TrendingUp, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function CustomerList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const queryParams: any = { page, limit: 10 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (statusFilter && statusFilter !== "all") queryParams.status = statusFilter;
  if (tierFilter && tierFilter !== "all") queryParams.loyaltyTier = tierFilter;

  const { data: customerData, isLoading, refetch } = useListCustomers(queryParams);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteCustomer = useDeleteCustomer();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setDebouncedSearch(search);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setTierFilter("all");
    setPage(1);
  };

  const openNewModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const confirmDelete = (id: number) => {
    setCustomerToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!customerToDelete) return;
    deleteCustomer.mutate({ id: customerToDelete }, {
      onSuccess: () => {
        toast({ title: "Customer deleted successfully" });
        setIsDeleteDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error deleting customer", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Customers</h1>
          <p className="text-muted-foreground">Manage customer profiles and loyalty tiers.</p>
        </div>
        <Button onClick={openNewModal} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or phone..." 
            className="pl-9 bg-background w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-[150px]">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-[150px]">
            <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(debouncedSearch || statusFilter !== "all" || tierFilter !== "all") && (
            <Button variant="outline" onClick={handleClearFilters} className="px-3">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background/50">
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Contact</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Address</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Tier</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Orders</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Spent</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Actions</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : customerData?.customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No customers found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                customerData?.customers.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{c.email || '-'}</div>
                      <div className="text-xs text-muted-foreground">{c.phone || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{[c.address, c.city, c.country].filter(Boolean).join(', ') || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={c.loyaltyTier} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.totalOrders}</TableCell>
                    <TableCell className="text-right text-foreground font-mono">${c.totalSpent.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setViewingCustomer(c)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="View orders">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(c)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {customerData && customerData.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-background/30">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{((page - 1) * customerData.limit) + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * customerData.limit, customerData.total)}</span> of <span className="font-medium text-foreground">{customerData.total}</span> customers
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(customerData.totalPages, p + 1))}
                disabled={page === customerData.totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Forms and Dialogs */}
      <CustomerFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        customer={editingCustomer} 
      />

      {viewingCustomer && (
        <CustomerDetailPanel customer={viewingCustomer} onClose={() => setViewingCustomer(null)} />
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif text-xl">Delete Customer</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete this customer? This action cannot be undone. All their order history and loyalty points will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCustomer.isPending}>
              {deleteCustomer.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    vip: "bg-primary/10 text-primary border-primary/20",
    inactive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    banned: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <Badge className={`${colors[status]} border capitalize`} variant="outline">{status}</Badge>;
}

// ── Customer Detail Panel ──────────────────────────────────────────────────

type OrderItem = { id: number; itemName: string; itemCategory: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = { id: number; status: string; totalAmount: number; notes: string | null; createdAt: string; items: OrderItem[] };

function CustomerDetailPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    setLoadingOrders(true);
    fetch(`/api/customers/${customer.id}/orders`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [customer.id]);

  const infoRow = (icon: React.ReactNode, label: string, value: string | null | undefined) =>
    value ? (
      <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
        <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    ) : null;

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
          <div>
            <h2 className="text-xl font-serif font-bold text-foreground">{customer.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={customer.status} />
              <TierBadge tier={customer.loyaltyTier} />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Stats row */}
          <div className="grid grid-cols-3 border-b border-border">
            {[
              { icon: <ShoppingBag className="w-4 h-4" />, label: "Orders", value: customer.totalOrders.toString() },
              { icon: <TrendingUp className="w-4 h-4" />, label: "Total Spent", value: `${customer.totalSpent.toFixed(2)}` },
              { icon: <Award className="w-4 h-4" />, label: "Loyalty Pts", value: customer.loyaltyPoints.toString() },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center py-4 border-r border-border last:border-0 gap-1">
                <span className="text-primary">{s.icon}</span>
                <span className="text-lg font-bold text-foreground">{s.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Contact & personal info */}
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Contact Info</p>
            {infoRow(<Mail className="w-3.5 h-3.5" />, "Email", customer.email)}
            {infoRow(<Phone className="w-3.5 h-3.5" />, "Phone", customer.phone)}
            {infoRow(<MapPin className="w-3.5 h-3.5" />, "Location", [customer.address, customer.city, customer.country].filter(Boolean).join(", "))}
            {infoRow(<Calendar className="w-3.5 h-3.5" />, "First Visit", customer.firstVisitDate ? new Date(customer.firstVisitDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : null)}
            {infoRow(<Calendar className="w-3.5 h-3.5" />, "Last Visit", customer.lastVisitDate ? new Date(customer.lastVisitDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : null)}
            {customer.notes && (
              <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-foreground">{customer.notes}</p>
              </div>
            )}
            {customer.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {customer.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Order history */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Order History</p>
              {orders.length > 0 && (
                <span className="text-xs text-muted-foreground">{orders.length} orders · ${totalRevenue.toFixed(2)} total</span>
              )}
            </div>

            {loadingOrders ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                    {/* Order header */}
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                            {order.notes ? ` · ${order.notes}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">${order.totalAmount.toFixed(2)}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          order.status === "completed" ? "bg-green-500/10 text-green-600" :
                          order.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                          "bg-amber-500/10 text-amber-600"
                        }`}>{order.status}</span>
                      </div>
                    </button>

                    {/* Expanded items */}
                    {expandedOrder === order.id && order.items?.length > 0 && (
                      <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-1.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">
                              <span className="text-muted-foreground text-xs mr-2">{item.quantity}×</span>
                              {item.itemName}
                            </span>
                            <span className="font-mono text-muted-foreground text-xs">${item.lineTotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    platinum: "bg-slate-300 text-slate-800",
    gold: "bg-yellow-500 text-yellow-950",
    silver: "bg-slate-400 text-slate-900",
    bronze: "bg-amber-700 text-amber-50",
  };
  return <Badge className={`${colors[tier]} border-0 capitalize`}>{tier}</Badge>;
}

// Extracted form modal
export function CustomerFormModal({ isOpen, onClose, customer }: { isOpen: boolean, onClose: () => void, customer: Customer | null }) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "", email: "", phone: "", status: "active" as any, loyaltyTier: "bronze" as any, tags: []
  });

  // Reset form when opened with a customer or null
  useState(() => {
    if (customer) {
      setFormData(customer);
    } else {
      setFormData({ name: "", email: "", phone: "", status: "active" as any, loyaltyTier: "bronze" as any, tags: [] });
    }
  });

  // A more robust useEffect to handle updates when customer prop changes
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setFormData(customer);
      } else {
        setFormData({ name: "", email: "", phone: "", status: "active" as any, loyaltyTier: "bronze" as any, tags: [] });
      }
    }
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Process tags from string to array if it's a string from an input
    let processedData = { ...formData };
    if (typeof processedData.tags === 'string') {
      processedData.tags = (processedData.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    if (customer) {
      updateCustomer.mutate({ id: customer.id, data: processedData as any }, {
        onSuccess: () => {
          toast({ title: "Customer updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          onClose();
        },
        onError: (err: any) => {
          toast({ title: "Error updating customer", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createCustomer.mutate({ data: processedData as CustomerInput }, {
        onSuccess: () => {
          toast({ title: "Customer created successfully" });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          onClose();
        },
        onError: (err: any) => {
          toast({ title: "Error creating customer", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{customer ? "Edit Customer" : "New Customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input 
                id="name" 
                required 
                value={formData.name || ""} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email || ""} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={formData.phone || ""} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input 
                id="city" 
                value={formData.city || ""} 
                onChange={(e) => setFormData({...formData, city: e.target.value})} 
                className="bg-background"
              />
            </div>
          </div>
          
          <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as any})}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loyalty Tier</Label>
              <Select value={formData.loyaltyTier} onValueChange={(v) => setFormData({...formData, loyaltyTier: v as any})}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input 
              id="tags" 
              placeholder="e.g. regular, prefers-spicy, allergy-nuts" 
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : (formData.tags || "")} 
              onChange={(e) => setFormData({...formData, tags: e.target.value as any})} 
              className="bg-background"
            />
          </div>

          {customer && (
             <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
               <div className="bg-background p-3 rounded border border-border">
                 <div className="text-xs text-muted-foreground mb-1">Total Orders</div>
                 <div className="font-mono text-xl">{customer.totalOrders}</div>
               </div>
               <div className="bg-background p-3 rounded border border-border">
                 <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
                 <div className="font-mono text-xl">${customer.totalSpent.toFixed(2)}</div>
               </div>
               <div className="bg-background p-3 rounded border border-border">
                 <div className="text-xs text-muted-foreground mb-1">Loyalty Pts</div>
                 <div className="font-mono text-xl">{customer.loyaltyPoints}</div>
               </div>
             </div>
          )}

          <DialogFooter className="mt-8 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {customer ? "Save Changes" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}