import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { evaluateCheckout } from '../_shared/checkout-guard.ts';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select(`*, designer:designers(*)`)
      .eq('id', drop_id)
      .single();

    if (dropError || !drop) {
      return new Response(
        JSON.stringify({ error: 'Drop not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Direct calls are refused for every non-live status, including pending_review,
    // before Paystack is contacted. Live drops keep the stock and split checks below.
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

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qty = quantity || 1;
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

    if (drop.designer?.paystack_subaccount_code) {
      payload.subaccount = drop.designer.paystack_subaccount_code;
      payload.transaction_charge = Math.round(amount * 0.1);
    }

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
