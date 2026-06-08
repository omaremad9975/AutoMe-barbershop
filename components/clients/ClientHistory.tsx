'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { X, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, generateInvoiceNumber } from '@/lib/utils';
import type { Client, Invoice } from '@/lib/types';

interface Props {
  client: Client;
  onClose: () => void;
}

export function ClientHistory({ client, onClose }: Props) {
  const locale = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data ?? []) as Invoice[]);
        setLoading(false);
      });
  }, [client.id]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 end-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">
              {client.name} {client.code != null && <span className="text-sm font-normal text-gray-400">#{client.code}</span>}
            </h2>
            <p className="text-sm text-gray-500">
              {locale === 'ar' ? 'سجل الزيارات' : 'Visit History'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {locale === 'ar' ? 'إجمالي الزيارات' : 'Total Visits'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoices.reduce((s, i) => s + i.net_total, 0))}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {locale === 'ar' ? 'إجمالي الإنفاق' : 'Total Spent'}
            </p>
          </div>
        </div>

        {/* Invoices */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-center text-gray-400 py-8">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          ) : invoices.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              {locale === 'ar' ? 'لا توجد زيارات سابقة' : 'No previous visits'}
            </p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <span className="font-mono text-gray-500">{generateInvoiceNumber(inv.id)}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(inv.net_total)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{formatDate(inv.created_at)}</p>
                <div className="space-y-1">
                  {inv.invoice_items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-600">
                      <span>{item.name_snapshot} × {item.quantity}</span>
                      <span>{formatCurrency(item.price_snapshot * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
