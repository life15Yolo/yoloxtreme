export type Designer = {
  id: string;
  brand_name: string;
  email: string;
  phone: string | null;
  bank_name: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  verified: boolean;
  created_at: string;
};

export type Drop = {
  id: string;
  designer_id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  max_qty: number;
  current_qty: number;
  status: 'live' | 'funded' | 'producing' | 'shipped';
  countdown_end: string | null;
  images: string[];
  sizes: string[];
  created_at: string;
  designer?: Designer;
};

export type Preorder = {
  id: string;
  drop_id: string;
  buyer_email: string;
  buyer_name: string | null;
  size: string | null;
  quantity: number;
  amount: number;
  paystack_ref: string | null;
  status: 'pending' | 'paid' | 'shipped';
  created_at: string;
};

export type RoomPost = {
  id: string;
  drop_id: string;
  user_id: string | null;
  type: 'launch' | 'review' | 'question' | 'collab';
  content: string;
  created_at: string;
};

export type DropWithDesigner = Drop & {
  designer: Designer;
};
