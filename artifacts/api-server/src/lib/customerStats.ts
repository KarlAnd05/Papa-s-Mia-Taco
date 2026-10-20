import { eq, sql } from "drizzle-orm";
import { customersTable } from "@workspace/db";
import type { Executor } from "./http";
import { centsToDecimal, toCents } from "./money";

// Credit a completed order to the customer's totals and loyalty (5 points per $1).
export async function recordCompletedOrder(q: Executor, customerId: number, totalCents: number): Promise<void> {
  const [customer] = await q.select().from(customersTable).where(eq(customersTable.id, customerId));
  if (!customer) return;

  const newTotalCents = toCents(customer.totalSpent) + totalCents;
  const newOrders = (customer.totalOrders ?? 0) + 1;
  const newPoints = (customer.loyaltyPoints ?? 0) + Math.floor(totalCents / 20);
  const newTier =
    newPoints >= 5000 ? "platinum" :
    newPoints >= 2000 ? "gold" :
    newPoints >= 800  ? "silver" : "bronze";

  await q
    .update(customersTable)
    .set({
      totalOrders: newOrders,
      totalSpent: centsToDecimal(newTotalCents),
      averageOrderValue: centsToDecimal(Math.round(newTotalCents / newOrders)),
      loyaltyPoints: newPoints,
      loyaltyTier: newTier,
      lastVisitDate: new Date(),
      firstVisitDate: customer.firstVisitDate ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customersTable.id, customerId));
}

// Find a customer by phone number (ignoring formatting and a country-code prefix), or create one.
export async function findOrCreateCustomerByPhone(
  q: Executor,
  data: { name: string; phone: string; email?: string | null },
): Promise<number> {
  const digits = data.phone.replace(/\D/g, "");
  const stored = sql`regexp_replace(coalesce(${customersTable.phone}, ''), '\\D', '', 'g')`;
  const [existing] = await q
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(
      sql`${stored} = ${digits} or (length(${stored}) >= 8 and length(${digits}) >= 8
        and (${stored} like '%' || ${digits} or ${digits} like '%' || ${stored}))`,
    )
    .orderBy(sql`(${stored} = ${digits}) desc`, customersTable.id)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await q
    .insert(customersTable)
    .values({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      preferredContactMethod: "phone",
      tags: ["online order"],
    })
    .returning({ id: customersTable.id });
  return created.id;
}
