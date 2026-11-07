export const NEW_DROP_STATUS = 'pending_review' as const;

export type NewDropInsert = {
  designer_id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  max_qty: number;
  current_qty: 0;
  status: typeof NEW_DROP_STATUS;
  countdown_end: string | null;
  images: string[];
  sizes: string[];
};

export function buildDropInsert(input: {
  designer_id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  max_qty: number;
  countdown_end: string | null;
  images: string[];
  sizes: string[];
}): NewDropInsert {
  return {
    designer_id: input.designer_id,
    slug: input.slug,
    title: input.title,
    description: input.description,
    price: input.price,
    max_qty: input.max_qty,
    current_qty: 0,
    status: NEW_DROP_STATUS,
    countdown_end: input.countdown_end,
    images: input.images,
    sizes: input.sizes,
  };
}
