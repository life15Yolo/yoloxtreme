import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { evaluateCheckout } from '../_shared/checkout-guard.ts';
import { evaluatePaymentAccess, parseOrderQuantity, quantityFitsStock } from '../_shared/payment-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { drop_id, email, name, phone, size, quantity } = await req.json();

    if (!drop_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing drop_id or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedQuantity = parseOrderQuantity(quantity ?? 1);
    if (!parsedQuantity.ok) {
      return new Response(
        JSON.stringify({ error: parsedQuantity.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('id, slug, title, price, status, current_qty, max_qty, designer:designers_public(brand_name)')
      .eq('id', drop_id)
      .single();

    if (dropError || !drop) {
      return new Response(
        JSON.stringify({ error: 'Drop not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Direct calls are refused for every non-live status, including pending_review,
    // before any payment provider is contacted.
    const checkout = evaluateCheckout({
      status: drop.status,
      current_qty: drop.current_qty,
      max_qty: drop.max_qty,
    });
    if (!checkout.ok) {
      return new Response(
        JSON.stringify({ error: checkout.error }),
        { status: checkout.httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!quantityFitsStock(drop.current_qty, drop.max_qty, parsedQuantity.quantity)) {
      return new Response(
        JSON.stringify({ error: 'Quantity exceeds the remaining preorder quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentAccess = evaluatePaymentAccess({
      mode: Deno.env.get('PAYMENTS_MODE'),
      secret: Deno.env.get('PAYSTACK_SECRET_KEY'),
    });
    if (!paymentAccess.ok) {
      return new Response(
        JSON.stringify({ error: paymentAccess.error }),
        { status: paymentAccess.httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')!;
    const qty = parsedQuantity.quantity;
    const amount = drop.price * qty;

    const payload: Record<string, unknown> = {
      email,
      amount,
      currency: 'NGN',
      reference: `yx_${drop.slug}_${Date.now()}`,
      callback_url: `${Deno.env.get('APP_URL') || 'https://yoloxtreme.tech'}/d/${drop.slug}`,
      metadata: {
        drop_id: drop.id,
        drop_slug: drop.slug,
        buyer_name: name || '',
        buyer_phone: phone || '',
        size: size || '',
        quantity: qty,
        custom_fields: [
          { display_name: 'Drop', variable_name: 'drop', value: drop.title },
          { display_name: 'Brand', variable_name: 'brand', value: drop.designer?.brand_name || '' },
          { display_name: 'Size', variable_name: 'size', value: size || 'N/A' },
        ],
      },
    };

    // Designer 90 / platform 10 is held until the buyer confirms compliant
    // delivery. That release is not implemented, so this payload has no split.
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to initialize payment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
