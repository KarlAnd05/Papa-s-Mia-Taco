import { z } from "zod/v4";
import { inArray } from "drizzle-orm";
import { menuItemsTable, type OrderItemOption } from "@workspace/db";
import { HttpError, type Executor } from "./http";
import { toCents } from "./money";

// Every order (POS and online) is priced here from the menu database.
// Prices sent by the browser are never trusted.

export const orderLinesSchema = z
  .array(
    z.object({
      menuItemId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(99),
      selections: z
        .array(z.object({ groupId: z.string().max(60), choiceIds: z.array(z.string().max(60)).max(30) }))
        .max(20)
        .default([]),
    }),
  )
  .min(1, "Add at least one item to the order")
  .max(100);

export type OrderLineInput = z.infer<typeof orderLinesSchema>[number];

export type PricedLine = {
  menuItemId: number;
  itemName: string;
  itemCategory: string;
  quantity: number;
  unitCents: number;
  lineCents: number;
  options: OrderItemOption[];
};

export async function priceLines(q: Executor, lines: OrderLineInput[]): Promise<PricedLine[]> {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const items = await q.select().from(menuItemsTable).where(inArray(menuItemsTable.id, ids));
  const byId = new Map(items.map((i) => [i.id, i]));

  const missing = ids.filter((id) => !byId.has(id));
  const unavailable = items.filter((i) => !i.isAvailable).map((i) => i.name);
  if (missing.length || unavailable.length) {
    throw new HttpError(
      409,
      unavailable.length
        ? `Sorry, ${unavailable.join(", ")} ${unavailable.length > 1 ? "are" : "is"} no longer available. Please update your order.`
        : "Some items in your order are no longer on the menu. Please update your order.",
      { unavailable },
    );
  }

  return lines.map((line) => {
    const item = byId.get(line.menuItemId)!;
    const groups = item.options ?? [];
    const chosen = new Map<string, Set<string>>();
    for (const sel of line.selections) {
      if (!groups.some((g) => g.id === sel.groupId)) throw new HttpError(400, `Invalid option for ${item.name}`);
      chosen.set(sel.groupId, new Set(sel.choiceIds));
    }

    let unitCents = toCents(item.price);
    const options: OrderItemOption[] = [];
    for (const group of groups) {
      const picked = chosen.get(group.id) ?? new Set<string>();
      if (group.type === "single" && picked.size > 1) throw new HttpError(400, `Choose only one "${group.name}" for ${item.name}`);
      if (group.required && picked.size === 0) throw new HttpError(400, `Please choose "${group.name}" for ${item.name}`);
      for (const choiceId of picked) {
        const choice = group.choices.find((c) => c.id === choiceId);
        if (!choice) throw new HttpError(400, `Invalid option for ${item.name}`);
      }
      // Keep the menu's choice order in the snapshot
      for (const choice of group.choices) {
        if (!picked.has(choice.id)) continue;
        unitCents += toCents(choice.price);
        options.push({ group: group.name, choice: choice.name, price: choice.price });
      }
    }

    return {
      menuItemId: item.id,
      itemName: item.name,
      itemCategory: item.category,
      quantity: line.quantity,
      unitCents,
      lineCents: unitCents * line.quantity,
      options,
    };
  });
}

export const discountSchema = z
  .object({
    type: z.enum(["percent", "amount"]),
    value: z.number().min(0),
    reason: z.string().trim().max(120).optional(),
  })
  .nullish();

export type DiscountInput = z.infer<typeof discountSchema>;

export function computeTotals(opts: {
  subtotalCents: number;
  discount?: DiscountInput;
  taxRate: number;
  deliveryFeeCents?: number;
}) {
  const { subtotalCents, discount, taxRate, deliveryFeeCents = 0 } = opts;
  let discountCents = 0;
  if (discount && discount.value > 0) {
    discountCents =
      discount.type === "percent"
        ? Math.round((subtotalCents * Math.min(discount.value, 100)) / 100)
        : Math.min(toCents(discount.value), subtotalCents);
  }
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * taxRate) / 100);
  return {
    subtotalCents,
    discountCents,
    taxCents,
    deliveryFeeCents,
    totalCents: taxableCents + taxCents + deliveryFeeCents,
  };
}
