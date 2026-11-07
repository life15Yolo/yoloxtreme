const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Signup and the private payout screen do not call this function.
// Provider subaccount setup stays deferred so this route cannot open a live payout.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: 'Payout provider setup is not available in this build' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
