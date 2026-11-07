import { NextResponse } from 'next/server';
import { approvalCommand } from '@/lib/admin-allowlist';
import { requireAdminFromRequest } from '@/lib/admin-auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const decision = await requireAdminFromRequest(request);
  const command = approvalCommand(decision, params.id, null);
  if (!command.ok) {
    return NextResponse.json({ error: command.error }, { status: command.status });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('approve_drop', command.rpc);
    if (error) {
      const message = error.message?.toLowerCase() ?? '';
      if (message.includes('not pending')) {
        return NextResponse.json({ error: 'Drop is not pending review' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ drop: row });
  } catch {
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }
}
