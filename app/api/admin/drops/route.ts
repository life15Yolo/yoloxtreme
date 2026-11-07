import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '@/lib/admin-auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const decision = await requireAdminFromRequest(request);
  if (!decision.ok) {
    return NextResponse.json({ error: decision.error }, { status: decision.status });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('drops')
      .select('id, slug, title, description, price, max_qty, current_qty, status, created_at, designer:designers(id, brand_name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Could not load the review queue' }, { status: 500 });
    }

    return NextResponse.json({ drops: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }
}
