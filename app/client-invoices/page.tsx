'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { WorkspaceShell } from '@/components/workspace-shell';
import { fetchDesignerInvoices, type Invoice } from '@/lib/workspace';
import { formatNaira } from '@/lib/utils';
import { CheckCircle, Clock, FileText, Loader2, Search, Truck } from 'lucide-react';

const statusFilters = ['all', 'paid', 'pending', 'shipped'] as const;
type StatusFilter = (typeof statusFilters)[number];

function invoiceNumber(invoice: Invoice) {
  const reference = invoice.paystack_ref || invoice.id;
  return `INV-${reference.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-lime">
        <CheckCircle className="h-3 w-3" />
        PAID
      </span>
    );
  }
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400">
        <Truck className="h-3 w-3" />
        SHIPPED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-white/40">
      <Clock className="h-3 w-3" />
      PENDING
    </span>
  );
}

export default function ClientInvoicesPage() {
  const { designer } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!designer) return;
    let active = true;
    (async () => {
      const data = await fetchDesignerInvoices(designer.id);
      if (!active) return;
      setInvoices(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [designer]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (accumulator, invoice) => {
        const amount = Number(invoice.amount);
        accumulator.all += amount;
        if (invoice.status === 'paid') accumulator.paid += amount;
        if (invoice.status === 'pending') accumulator.pending += amount;
        return accumulator;
      },
      { all: 0, paid: 0, pending: 0 },
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (status !== 'all' && invoice.status !== status) return false;
      if (!term) return true;
      return [
        invoice.buyer_name || '',
        invoice.buyer_email,
        invoice.drop?.title || '',
        invoice.paystack_ref || '',
        invoiceNumber(invoice),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [invoices, status, query]);

  const summary = [
    { label: 'Invoiced', value: formatNaira(totals.all), tone: 'text-white' },
    { label: 'Paid', value: formatNaira(totals.paid), tone: 'text-lime' },
    { label: 'Outstanding', value: formatNaira(totals.pending), tone: 'text-white/60' },
  ];

  return (
    <WorkspaceShell>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-black tracking-tighter text-white">Client Invoices</h2>
        <p className="mt-1 text-sm text-white/50">
          Every billing document generated from your preorders.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="rounded-3xl border border-white/10 bg-card p-5">
            <div className={`font-display text-2xl font-black ${item.tone}`}>{item.value}</div>
            <div className="mt-1 text-xs text-white/40">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by client, project or invoice number..."
            className="w-full rounded-2xl border border-white/15 bg-card py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatus(filter)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                status === filter
                  ? 'bg-lime text-black'
                  : 'border border-white/10 text-white/50 hover:border-lime/30 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-lime animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h3 className="font-display text-xl font-black text-white">No invoices yet</h3>
          <p className="mt-2 text-white/40">
            Invoices appear automatically when a buyer preorders one of your drops.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card p-10 text-center text-white/40">
          No invoices match your filters.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-card sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/40">
                  <th className="px-5 py-3 text-left">Invoice</th>
                  <th className="px-5 py-3 text-left">Client</th>
                  <th className="px-5 py-3 text-left">Project</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 text-sm hover:bg-white/5">
                    <td className="px-5 py-3 font-mono text-xs text-white/60">
                      {invoiceNumber(invoice)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white">
                        {invoice.buyer_name || invoice.buyer_email}
                      </div>
                      <div className="text-xs text-white/40">{invoice.buyer_email}</div>
                    </td>
                    <td className="px-5 py-3 text-white/70">{invoice.drop?.title || '—'}</td>
                    <td className="px-5 py-3 font-semibold text-white">
                      {formatNaira(invoice.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-white/40">
                      {new Date(invoice.created_at).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 sm:hidden">
            {filtered.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border border-white/10 bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-white/40">{invoiceNumber(invoice)}</span>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="font-semibold text-white">
                  {invoice.buyer_name || invoice.buyer_email}
                </div>
                <div className="text-sm text-white/60">{invoice.drop?.title || '—'}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-white/40">
                    {new Date(invoice.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="font-semibold text-lime">{formatNaira(invoice.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
