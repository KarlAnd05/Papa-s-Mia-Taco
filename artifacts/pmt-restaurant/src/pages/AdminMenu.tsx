import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Edit, Check, X, Plus, Trash2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────

type MenuItem = {
  id: number;
  category: string;
  sortOrder: number;
  name: string;
  description: string | null;
  price: number;
  note: string | null;
  callout: string | null;
  boost: string | null;
  isNew: boolean;
  isAvailable: boolean;
};

// ── Inline Price Editor ────────────────────────────────────────────────────

function InlinePriceEditor({
  item,
  onSave,
}: {
  item: MenuItem;
  onSave: (id: number, updates: Partial<MenuItem>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.price.toFixed(2));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) { setEditing(false); setValue(item.price.toFixed(2)); return; }
    setSaving(true);
    await onSave(item.id, { price: parsed });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">$</span>
        <Input
          className="h-7 w-20 text-sm bg-background px-2 py-0"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(item.price.toFixed(2)); } }}
          onBlur={commit}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 group text-left"
      onClick={() => setEditing(true)}
      title="Click to edit price"
    >
      <span className="font-mono font-semibold text-foreground">${item.price.toFixed(2)}</span>
      <Edit className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Item Edit Dialog ───────────────────────────────────────────────────────

const CATEGORIES = [
  "Appetizers", "Tacos", "Burritos", "Burrito Bowls",
  "Salads & Shakers", "Quesadillas", "The Taco Bar",
  "Dessert", "Dips & Sides", "Drinks",
];

function ItemDialog({
  item,
  isOpen,
  onClose,
  onSave,
}: {
  item: MenuItem | null; // null = new item
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number | null, data: Partial<MenuItem>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(item
        ? { ...item }
        : { category: "Tacos", price: 0, isNew: false, isAvailable: true, name: "", description: "", note: "" }
      );
    }
  }, [item, isOpen]);

  const set = (k: keyof MenuItem, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim() || form.price == null) return;
    setSaving(true);
    await onSave(item?.id ?? null, form);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">
            {item ? "Edit Item" : "New Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input className="bg-background" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Price ($) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                className="bg-background"
                value={form.price ?? ""}
                onChange={(e) => set("price", parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category ?? "Tacos"} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note / Modifier hint</Label>
            <Input
              className="bg-background"
              placeholder="e.g. Large: $13"
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>
          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isNew ?? false} onChange={(e) => set("isNew", e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm font-medium">Mark as NEW</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isAvailable ?? true} onChange={(e) => set("isAvailable", e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm font-medium">Available</span>
            </label>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name?.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Category Section ───────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  onSaveItem,
  onEditItem,
  onDeleteItem,
}: {
  category: string;
  items: MenuItem[];
  onSaveItem: (id: number, updates: Partial<MenuItem>) => Promise<void>;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const availableCount = items.filter((i) => i.isAvailable).length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Category header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          <h3 className="font-serif font-bold text-lg text-white">{category}</h3>
          <span className="text-xs text-muted-foreground">{items.length} items · {availableCount} available</span>
        </div>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="border-t border-border divide-y divide-border/50">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-5 py-3 transition-colors ${!item.isAvailable ? "opacity-50" : "hover:bg-white/[0.02]"}`}
            >
              {/* Availability toggle */}
              <button
                type="button"
                className="mt-0.5 flex-shrink-0"
                title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                onClick={() => onSaveItem(item.id, { isAvailable: !item.isAvailable })}
              >
                {item.isAvailable
                  ? <ToggleRight className="w-5 h-5 text-primary" />
                  : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              </button>

              {/* Name + desc */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{item.name}</span>
                  {item.isNew && <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px] px-1.5 py-0 h-4">NEW</Badge>}
                  {!item.isAvailable && <Badge className="bg-muted text-muted-foreground border-0 text-[10px] px-1.5 py-0 h-4">Unavailable</Badge>}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                )}
                {item.note && (
                  <p className="text-xs text-amber-500/80 mt-0.5 italic">{item.note}</p>
                )}
              </div>

              {/* Price (inline editable) */}
              <div className="flex-shrink-0 self-center">
                <InlinePriceEditor item={item} onSave={onSaveItem} />
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1 self-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => onEditItem(item)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteItem(item.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null | "new">(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menu-items");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast({ title: "Failed to load menu items", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const saveItem = async (id: number | null, updates: Partial<MenuItem>) => {
    try {
      const res = await fetch(id ? `/api/menu-items/${id}` : "/api/menu-items", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: MenuItem = await res.json();
      setItems((prev) =>
        id
          ? prev.map((it) => (it.id === id ? saved : it))
          : [...prev, saved]
      );
      if (!id) toast({ title: `"${saved.name}" added to the menu` });
    } catch (err: any) {
      toast({ title: "Failed to save item", description: err.message, variant: "destructive" });
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await fetch(`/api/menu-items/${id}`, { method: "DELETE", credentials: "include" });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setDeletingId(null);
      toast({ title: "Item removed" });
    } catch {
      toast({ title: "Failed to delete item", variant: "destructive" });
    }
  };

  // Group items by category in their original order
  const grouped = useMemo(() => {
    const filtered = search
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.category.toLowerCase().includes(search.toLowerCase()) ||
            (i.description ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : items;

    const map = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [items, search]);

  const totalItems = items.length;
  const unavailableCount = items.filter((i) => !i.isAvailable).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1">Menu Management</h1>
          <p className="text-muted-foreground">
            {totalItems} items across {grouped.size} categories
            {unavailableCount > 0 && <span className="text-amber-500"> · {unavailableCount} unavailable</span>}
          </p>
        </div>
        <Button onClick={() => setEditingItem("new")}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 bg-card border-border"
          placeholder="Search items, categories, or descriptions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch("")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><ToggleRight className="w-4 h-4 text-primary" /> Toggle availability</span>
        <span className="flex items-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Click price to edit inline</span>
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : grouped.size === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          {search ? "No items match your search." : "No menu items yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([cat, catItems]) => (
            <CategorySection
              key={cat}
              category={cat}
              items={catItems}
              onSaveItem={saveItem}
              onEditItem={setEditingItem}
              onDeleteItem={setDeletingId}
            />
          ))}
        </div>
      )}

      {/* Edit / New dialog */}
      <ItemDialog
        item={editingItem === "new" ? null : editingItem}
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSave={saveItem}
      />

      {/* Delete confirm dialog */}
      <Dialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif text-xl">Remove Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            This will permanently remove the item from the menu. This cannot be undone.
          </p>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingId && deleteItem(deletingId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
