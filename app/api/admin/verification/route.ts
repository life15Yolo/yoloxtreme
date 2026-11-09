import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '@/lib/admin-auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const decision = await requireAdminFromRequest(request);
  if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: decision.status });
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('verification_applications')
      .select('id, designer_id, status, submission_reference, submitted_at, identity_document_url, brand_authorization_url, business_registration_url, business_info, designer:designers(brand_name, email, phone)')
      .in('status', ['submitted', 'pending_info'])
      .order('submitted_at', { ascending: true });
    if (error) return NextResponse.json({ error: 'Could not load verification applications' }, { status: 500 });
    return NextResponse.json({ applications: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const decision = await requireAdminFromRequest(request);
  if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: decision.status });
  try {
    const body = await request.json() as { applicationId?: string; action?: string; reason?: string };
    if (!body.applicationId || !['approve', 'request_info', 'reject'].includes(body.action || '')) {
      return NextResponse.json({ error: 'Application and valid action are required' }, { status: 400 });
    }
    if (body.action !== 'approve' && !body.reason?.trim()) return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
    const supabase = createServiceRoleClient();
    const status = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'pending_info';
    const { data: application, error: appError } = await supabase.from('verification_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', body.applicationId).select('designer_id').single();
    if (appError || !application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    const reviewerId = decision.userId;
    await supabase.from('verification_reviews').insert({ application_id: body.applicationId, reviewer_id: reviewerId, action: body.action, reason: body.reason || null });
    if (body.action === 'approve') {
      await supabase.from('designers').update({ verified: true }).eq('id', application.designer_id);
      await supabase.from('commercial_accounts').upsert({ designer_id: application.designer_id, status: 'eligible', eligible_at: new Date().toISOString() }, { onConflict: 'designer_id' });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save review' }, { status: 500 });
  }
}
