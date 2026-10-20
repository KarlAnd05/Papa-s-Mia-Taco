import { useState } from "react";
import { useListCustomers } from "@workspace/api-client-react";
import { Search, Trash2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ── Customer picker ────────────────────────────────────────────────────────

export function CustomerPicker({
  value,
  onChange,
}: {
  value: { id: number; name: string } | null;
  onChange: (c: { id: number; name: string } | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useListCustomers({ search: search || undefined, limit: 8 });

  const handleSelect = (c: { id: number; name: string }) => {
    onChange(c);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">{value.name}</span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customer name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              className="pl-9 text-sm h-9"
            />
          </div>
          {open && (
            <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden">
              {!data?.customers?.length ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  {search ? "No customers found" : "Type to search customers"}
                </div>
              ) : (
                data.customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => handleSelect({ id: c.id, name: c.name })}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 text-left transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email || c.phone || "No contact"}</p>
                    </div>
                    <Badge className="ml-auto capitalize text-[10px]" variant="outline">{c.loyaltyTier}</Badge>
                  </button>
                ))
              )}
              <button
                type="button"
                onMouseDown={() => { onChange(null); setOpen(false); }}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border"
              >
                Continue without linking a customer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
