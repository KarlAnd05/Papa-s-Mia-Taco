// Shapes returned by the API server (artifacts/api-server).

export type MenuOptionChoice = { id: string; name: string; price: number };
export type MenuOptionGroup = {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  choices: MenuOptionChoice[];
};

export type MenuItem = {
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
  options: MenuOptionGroup[];
};

export type MenuSection = {
  category: string;
  callout: string | null;
  boost: string | null;
  items: MenuItem[];
};

export type Settings = {
  restaurant: {
    name: string;
    location: string;
    address: string;
    phone: string;
    hours: string; // one line per row
    instagram: string;
    facebook: string;
    tiktok: string;
    timezone: string;
  };
  ordering: {
    enabled: boolean;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    deliveryFee: number;
    minimumOrder: number;
    pickupMinutes: number;
    deliveryMinutes: number;
  };
  tax: { rate: number; label: string };
  reservations: {
    enabled: boolean;
    maxPartySize: number;
    bookingWindowDays: number;
    minNoticeMinutes: number;
    autoApprove: boolean;
  };
};

// Selected options for one order line: groupId -> choice ids
export type Selections = Record<string, string[]>;

export type OrderItemOption = { group: string; choice: string; price: number };

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";
export type OrderType = "dine_in" | "takeaway" | "pickup" | "delivery";

export type Order = {
  id: number;
  customerId?: number | null;
  status: OrderStatus;
  source: "pos" | "online";
  orderType: OrderType | null;
  tableLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  deliveryAddress: string | null;
  subtotal: number;
  discountType: "percent" | "amount" | null;
  discountValue: number | null;
  discountAmount: number;
  discountReason: string | null;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string | null;
  amountTendered: number | null;
  changeDue: number | null;
  notes: string | null;
  createdAt: string;
  statusUpdatedAt: string | null;
  completedAt: string | null;
  estimatedMinutes?: number;
  customer?: { id: number; name: string; phone: string | null; email: string | null } | null;
  items: {
    id: number;
    menuItemId: number | null;
    itemName: string;
    itemCategory: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    options: OrderItemOption[];
  }[];
};

export type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";

export type PublicReservation = {
  code: string;
  date: string;
  time: string;
  partySize: number;
  name: string;
  phone: string;
  email: string | null;
  comments: string | null;
  status: ReservationStatus;
  adminNote: string | null;
  createdAt: string;
  canCancel: boolean;
};

export type Reservation = Omit<PublicReservation, "canCancel"> & {
  id: number;
  accessToken: string;
  updatedAt: string;
};

export type StaffUser = { id: number; username: string; displayName: string };
