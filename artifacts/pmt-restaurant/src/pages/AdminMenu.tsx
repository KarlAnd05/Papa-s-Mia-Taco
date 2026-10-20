import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Edit, Check, X, Plus, Trash2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { MENU_QUERY_KEY } from "@/hooks/useMenu";
import type { MenuItem, MenuOptionGroup } from "@/lib/types";

// ── Inline Price Editor ────────────────────────────────────────────────────

function InlinePriceEditor({
  item,
  onSave,
}: {
  item: MenuItem;
  onSave: (id: number, updates: Partial<MenuItem>) => Promise<boolean>;
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

const newId = () => Math.random().toString(36).slice(2, 10);

// Edit the option groups of an item (sizes, add-ons, sauces). Prices are added to the item price.
function OptionsEditor({ value, onChange }: { value: MenuOptionGroup[]; onChange: (v: MenuOptionGroup[]) => void }) {
  const update = (i: number, patch: Partial<MenuOptionGroup>) => onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <div className="space-y-3">
      {value.map((group, gi) => (
        <div key={group.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 flex-1 min-w-40" placeholder="Group name, e.g. Size" value={group.name} onChange={(e) => update(gi, { name: e.target.value })} />
            <Select value={group.type} onValueChange={(v) => update(gi, { type: v as MenuOptionGroup["type"] })}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Pick one</SelectItem>
                <SelectItem value="multiple">Pick any</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" className="accent-primary w-4 h-4" checked={group.required} onChange={(e) => update(gi, { required: e.target.checked })} />
              Required
            </label>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onChange(value.filter((_, j) => j !== gi))} aria-label="Remove group">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {group.choices.map((choice, ci) => (
            <div key={choice.id} className="flex items-center gap-2 pl-3">
              <Input className="h-8 flex-1" placeholder="Choice, e.g. Large" value={choice.name} onChange={(e) => update(gi, { choices: group.choices.map((c, k) => (k === ci ? { ...c, name: e.target.value } : c)) })} />
              <span className="text-xs text-muted-foreground">+$</span>
              <Input className="h-8 w-20" type="number" min="0" step="0.05" value={choice.price} onChange={(e) => update(gi, { choices: group.choices.map((c, k) => (k === ci ? { ...c, price: parseFloat(e.target.value) || 0 } : c)) })} aria-label="Extra price" />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={group.choices.length <= 1} onClick={() => update(gi, { choices: group.choices.filter((_, k) => k !== ci) })} aria-label="Remove choice">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" className="ml-3" onClick={() => update(gi, { choices: [...group.choices, { id: newId(), name: "", price: 0 }] })}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add choice
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { id: newId(), name: "", type: "multiple", required: false, choices: [{ id: newId(), name: "", price: 0 }] }])}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add option group
      </Button>
    </div>
  );
}

function ItemDialog({
  item,
  categories,
  isOpen,
  onClose,
  onSave,
}: {
  item: MenuItem | null; // null = new item
  categories: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number | null, data: Partial<MenuItem>) => Promise<boolean>;
}) {
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(item
        ? { ...item }
        : { category: categories[0] ?? "", price: 0, isNew: false, isAvailable: true, name: "", description: "", note: "", options: [] }
      );
    }
  }, [item, isOpen]);

  const set = (k: keyof MenuItem, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim() || form.price == null || !form.category?.trim()) return;
    const { id: _id, sortOrder: _sortOrder, ...data } = form;
    setSaving(true);
    const ok = await onSave(item?.id ?? null, {
      ...data,
      // Drop empty rows left in the options editor
      options: (form.options ?? [])
        .map((g) => ({ ...g, choices: g.choices.filter((c) => c.name.trim()) }))
        .filter((g) => g.name.trim() && g.choices.length),
    });
    setSaving(false);
    if (ok) onClose();
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
            <Label>Category <span className="text-destructive">*</span></Label>
            <Input className="bg-background" list="menu-categories" value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} placeholder="Pick a category or type a new one" />
            <datalist id="menu-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
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
          <div className="space-y-1.5">
            <Label>Options (sizes, add-ons, sauces…)</Label>
            <p className="text-xs text-muted-foreground">Customers and cashiers choose these when ordering. Extra prices are added to the item price.</p>
            <OptionsEditor value={form.options ?? []} onChange={(v) => set("options", v)} />
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
          <Button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.category?.trim()}>
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
  onSaveItem: (id: number, updates: Partial<MenuItem>) => Promise<boolean>;
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
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          <h3 className="font-serif font-bold text-lg text-foreground">{category}</h3>
          <span className="text-xs text-muted-foreground">{items.length} items · {availableCount} available</span>
        </div>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="border-t border-border divide-y divide-border/50">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-5 py-3 transition-colors ${!item.isAvailable ? "opacity-50" : "hover:bg-muted/40"}`}
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
                  {item.options.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4" title={item.options.map((g) => g.name).join(", ")}>
                      {item.options.length} option {item.options.length === 1 ? "group" : "groups"}
                    </Badge>
                  )}
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
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground" onClick={() => onEditItem(item)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteItem(item.id)}>
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
  const queryClient = useQueryClient();

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

  const saveItem = async (id: number | null, updates: Partial<MenuItem>): Promise<boolean> => {
    try {
      const res = await fetch(id ? `/api/menu-items/${id}` : "/api/menu-items", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
      const saved: MenuItem = await res.json();
      setItems((prev) =>
        id
          ? prev.map((it) => (it.id === id ? saved : it))
          : [...prev, saved]
      );
      if (!id) toast({ title: `"${saved.name}" added to the menu` });
      // Website, online ordering and POS read the same menu
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
      return true;
    } catch (err: any) {
      toast({ title: "Failed to save item", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const res = await fetch(`/api/menu-items/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
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
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Menu Management</h1>
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
        categories={[...new Set(items.map((i) => i.category))]}
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
