export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price_paise: number;
  icon: string;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  prep_time_mins: number;
};

export type MenuCategory = Category & {
  items: MenuItem[];
};

export type CartLine = {
  itemId: string;
  quantity: number;
};

export type CheckoutPayload = {
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: CartLine[];
};

export type OrderStatus = "pending" | "paid" | "preparing" | "ready" | "completed";
export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";

export type PublicOrder = {
  id: string;
  public_id: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  estimated_ready_at: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    quantity: number;
    item_name: string;
    unit_price_paise: number;
  }>;
};

export type AdminOrder = PublicOrder & {
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
};
