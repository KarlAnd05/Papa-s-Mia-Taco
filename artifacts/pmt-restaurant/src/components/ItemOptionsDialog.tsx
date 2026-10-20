import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money, unitPriceFor } from "@/lib/format";
import type { MenuItem, Selections } from "@/lib/types";

// Pick sizes / add-ons / sauces for an item. Shared by online ordering and the cashier POS.

function defaultSelections(item: MenuItem): Selections {
  const s: Selections = {};
  for (const g of item.options) {
    s[g.id] = g.type === "single" && g.required && g.choices[0] ? [g.choices[0].id] : [];
  }
  return s;
}

export function ItemOptionsDialog({
  item,
  open,
  onOpenChange,
  onAdd,
  showQuantity = true,
  confirmLabel = "Add to order",
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: MenuItem, selections: Selections, quantity: number) => void;
  showQuantity?: boolean;
  confirmLabel?: string;
}) {
  const [selections, setSelections] = useState<Selections>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open && item) {
      setSelections(defaultSelections(item));
      setQuantity(1);
    }
  }, [open, item]);

  if (!item) return null;

  const toggle = (groupId: string, choiceId: string, single: boolean, required: boolean) => {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (single) {
        if (current.includes(choiceId) && !required) return { ...prev, [groupId]: [] };
        return { ...prev, [groupId]: [choiceId] };
      }
      return {
        ...prev,
        [groupId]: current.includes(choiceId) ? current.filter((c) => c !== choiceId) : [...current, choiceId],
      };
    });
  };

  const missing = item.options.filter((g) => g.required && !(selections[g.id]?.length));
  const unit = unitPriceFor(item, selections);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#F8F5EF] border-2 border-[#0F5D2F] w-[calc(100%-1.5rem)] rounded-2xl sm:rounded-2xl sm:max-w-lg max-h-[92vh] overflow-hidden p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-[#0F5D2F]/15">
          <DialogTitle className="font-serif italic text-2xl font-black text-[#0F5D2F] pr-8">{item.name}</DialogTitle>
          {item.description && <DialogDescription className="text-[#555] text-sm leading-relaxed">{item.description}</DialogDescription>}
          <p className="text-sm font-bold text-[#0F5D2F]">{money(item.price)}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {item.options.map((group) => {
            const single = group.type === "single";
            return (
              <fieldset key={group.id}>
                <legend className="flex w-full items-center justify-between gap-2 mb-2.5">
                  <span className="font-bold text-[#222] uppercase tracking-wide text-[13px]">{group.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${group.required ? "bg-[#A71F29] text-white" : "bg-[#0F5D2F]/10 text-[#0F5D2F]"}`}>
                    {group.required ? "Required" : single ? "Optional" : "Choose any"}
                  </span>
                </legend>
                <div className="grid gap-2">
                  {group.choices.map((choice) => {
                    const selected = selections[group.id]?.includes(choice.id) ?? false;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        role={single ? "radio" : "checkbox"}
                        aria-checked={selected}
                        onClick={() => toggle(group.id, choice.id, single, group.required)}
                        className={`flex items-center gap-3 w-full min-h-12 px-4 py-2.5 rounded-xl border-2 text-left transition-colors ${
                          selected ? "border-[#0F5D2F] bg-[#0F5D2F]/[0.07]" : "border-[#e0dcd4] bg-white hover:border-[#0F5D2F]/40"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center border-2 ${single ? "rounded-full" : "rounded-md"} ${
                            selected ? "bg-[#0F5D2F] border-[#0F5D2F] text-white" : "border-[#bbb]"
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-[#222]">{choice.name}</span>
                        <span className="text-sm font-bold text-[#0F5D2F] tabular-nums">
                          {choice.price > 0 ? `+${money(choice.price)}` : single ? "" : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-[#0F5D2F]/15 bg-white flex items-center gap-2 sm:gap-3">
          {showQuantity && (
            <div className="flex items-center gap-1 rounded-full border-2 border-[#e0dcd4] p-1">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#0F5D2F] hover:bg-[#0F5D2F]/10 disabled:opacity-30"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-7 text-center font-bold tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#0F5D2F] hover:bg-[#0F5D2F]/10"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={missing.length > 0}
            onClick={() => {
              onAdd(item, selections, quantity);
              onOpenChange(false);
            }}
            className="flex-1 min-h-12 rounded-full bg-[#0F5D2F] text-white font-bold uppercase tracking-wide sm:tracking-wider text-[13px] sm:text-sm px-4 sm:px-5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0F5D2F]/90 transition-colors"
          >
            {missing.length > 0 ? (
              `Choose ${missing[0].name.toLowerCase()}`
            ) : (
              <>
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">{confirmLabel}</span> · {money(unit * quantity)}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
