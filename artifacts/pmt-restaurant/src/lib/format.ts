import type { MenuItem, OrderStatus, OrderType, ReservationStatus, Selections } from "./types";

export const money = (n: number) => `$${n.toFixed(2)}`;

// Menu-style price: "$5.50", "$4"
export const menuPrice = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

// "19:30" -> "7:30 PM"
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// "2026-10-17" -> "Saturday, October 17" (calendar date, no timezone shift)
export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  pickup: "Pickup",
  delivery: "Delivery",
};

export function orderStatusLabel(status: OrderStatus, orderType: OrderType | null): string {
  switch (status) {
    case "pending":
      return "New";
    case "preparing":
      return "Preparing";
    case "ready":
      return orderType === "delivery" ? "Out for delivery" : "Ready";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  pay_on_pickup: "Pay at pickup",
  pay_on_delivery: "Pay on delivery",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Awaiting confirmation",
  approved: "Confirmed",
  rejected: "Declined",
  cancelled: "Cancelled",
};

// Unit price of a menu item with the chosen options
export function unitPriceFor(item: MenuItem, selections: Selections): number {
  let price = item.price;
  for (const group of item.options) {
    for (const choice of group.choices) {
      if (selections[group.id]?.includes(choice.id)) price += choice.price;
    }
  }
  return Math.round(price * 100) / 100;
}

// Human-readable list of chosen options, in menu order
export function optionLabels(item: MenuItem, selections: Selections): string[] {
  const labels: string[] = [];
  for (const group of item.options) {
    for (const choice of group.choices) {
      if (selections[group.id]?.includes(choice.id)) labels.push(choice.name);
    }
  }
  return labels;
}

export const selectionsToApi = (selections: Selections) =>
  Object.entries(selections)
    .filter(([, ids]) => ids.length)
    .map(([groupId, choiceIds]) => ({ groupId, choiceIds }));
