// Remembers a customer's recent orders/reservations and contact details on this device,
// so they can find their status pages again without an account.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — not critical
  }
}

export type RecentOrder = { token: string; id: number; createdAt: string; total: number };
export type RecentReservation = { token: string; code: string; date: string; time: string; partySize: number };

const ORDERS_KEY = "pmt_recent_orders";
const RESERVATIONS_KEY = "pmt_recent_reservations";
const CUSTOMER_KEY = "pmt_customer_details";

export const getRecentOrders = () => read<RecentOrder[]>(ORDERS_KEY, []);
export const addRecentOrder = (o: RecentOrder) =>
  write(ORDERS_KEY, [o, ...getRecentOrders().filter((x) => x.token !== o.token)].slice(0, 5));

export const getRecentReservations = () => read<RecentReservation[]>(RESERVATIONS_KEY, []);
export const addRecentReservation = (r: RecentReservation) =>
  write(RESERVATIONS_KEY, [r, ...getRecentReservations().filter((x) => x.token !== r.token)].slice(0, 5));

export type SavedCustomer = { name: string; phone: string; email: string; address: string };
export const getSavedCustomer = () => read<SavedCustomer>(CUSTOMER_KEY, { name: "", phone: "", email: "", address: "" });
export const saveCustomer = (c: Partial<SavedCustomer>) => write(CUSTOMER_KEY, { ...getSavedCustomer(), ...c });
