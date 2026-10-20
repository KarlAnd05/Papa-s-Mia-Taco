import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import { eq, ilike, or, and, asc, desc, count, sql } from "drizzle-orm";
import {
  ListCustomersQueryParams,
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  DeleteCustomerParams,
} from "@workspace/api-zod";
import { requireStaff } from "../lib/auth";

const router = Router();

// List customers
router.get("/customers", requireStaff, async (req, res) => {
  try {
    const query = ListCustomersQueryParams.parse(req.query);
    const {
      search,
      status,
      loyaltyTier,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(customersTable.name, `%${search}%`),
          ilike(customersTable.email, `%${search}%`),
          ilike(customersTable.phone, `%${search}%`),
        ),
      );
    }
    if (status) {
      conditions.push(eq(customersTable.status, status));
    }
    if (loyaltyTier) {
      conditions.push(eq(customersTable.loyaltyTier, loyaltyTier));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const columnMap: Record<string, any> = {
      name: customersTable.name,
      email: customersTable.email,
      totalOrders: customersTable.totalOrders,
      totalSpent: customersTable.totalSpent,
      lastVisitDate: customersTable.lastVisitDate,
      createdAt: customersTable.createdAt,
    };

    const orderCol = columnMap[sortBy] ?? customersTable.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [totalResult] = await db
      .select({ count: count() })
      .from(customersTable)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const customers = await db
      .select()
      .from(customersTable)
      .where(whereClause)
      .orderBy(orderFn(orderCol))
      .limit(limit)
      .offset(offset);

    return res.json({
      customers: customers.map(formatCustomer),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to list customers");
    return res.status(400).json({ error: err.message });
  }
});

// Create customer
router.post("/customers", requireStaff, async (req, res) => {
  try {
    const body = CreateCustomerBody.parse(req.body);
    const [customer] = await db
      .insert(customersTable)
      .values({
        ...body,
        totalSpent: body.totalSpent?.toString() ?? "0",
        averageOrderValue:
          body.totalOrders && body.totalSpent
            ? (body.totalSpent / body.totalOrders).toString()
            : "0",
        firstVisitDate: new Date(),
        lastVisitDate: new Date(),
      })
      .returning();
    return res.status(201).json(formatCustomer(customer));
  } catch (err: any) {
    req.log.error({ err }, "Failed to create customer");
    return res.status(400).json({ error: err.message });
  }
});

// Get customer
router.get("/customers/:id", requireStaff, async (req, res) => {
  try {
    const { id } = GetCustomerParams.parse({ id: Number(req.params.id) });
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, id));
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json(formatCustomer(customer));
  } catch (err: any) {
    req.log.error({ err }, "Failed to get customer");
    return res.status(400).json({ error: err.message });
  }
});

// Update customer
router.put("/customers/:id", requireStaff, async (req, res) => {
  try {
    const { id } = UpdateCustomerParams.parse({ id: Number(req.params.id) });
    const body = UpdateCustomerBody.parse(req.body);

    const updates: any = { ...body };
    if (body.totalSpent !== undefined) {
      updates.totalSpent = body.totalSpent.toString();
    }
    if (body.totalOrders !== undefined && body.totalSpent !== undefined && body.totalOrders > 0) {
      updates.averageOrderValue = (body.totalSpent / body.totalOrders).toString();
    }

    const [customer] = await db
      .update(customersTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customersTable.id, id))
      .returning();

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json(formatCustomer(customer));
  } catch (err: any) {
    req.log.error({ err }, "Failed to update customer");
    return res.status(400).json({ error: err.message });
  }
});

// Delete customer
router.delete("/customers/:id", requireStaff, async (req, res) => {
  try {
    const { id } = DeleteCustomerParams.parse({ id: Number(req.params.id) });
    const [deleted] = await db
      .delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete customer");
    return res.status(400).json({ error: err.message });
  }
});

function formatCustomer(c: any) {
  return {
    ...c,
    totalSpent: parseFloat(c.totalSpent ?? "0"),
    averageOrderValue: parseFloat(c.averageOrderValue ?? "0"),
    lastVisitDate: c.lastVisitDate?.toISOString() ?? null,
    firstVisitDate: c.firstVisitDate?.toISOString() ?? null,
    createdAt: c.createdAt?.toISOString() ?? "",
    updatedAt: c.updatedAt?.toISOString() ?? "",
    tags: c.tags ?? [],
  };
}

export default router;
