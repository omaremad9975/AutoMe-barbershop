import Image from 'next/image';
import { Scissors } from 'lucide-react';
import { formatCurrency, generateInvoiceNumber, getPaymentMethodLabel } from '@/lib/utils';
import { format } from 'date-fns';
import type { Invoice, Shop } from '@/lib/types';

interface Props {
  invoice: Invoice;
  shop: Shop;
  locale: string;
}

export function Receipt({ invoice, shop, locale }: Props) {
  const isAr = locale === 'ar';

  return (
    <div className="font-sans text-gray-800" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div
        className="rounded-xl p-5 text-white text-center mb-4"
        style={{ backgroundColor: shop.brand_color }}
      >
        {shop.logo_url ? (
          <Image src={shop.logo_url} alt={shop.name} width={64} height={64}
            className="mx-auto rounded-lg object-cover mb-2" />
        ) : (
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Scissors className="w-6 h-6 text-white" />
          </div>
        )}
        <h2 className="text-xl font-bold">{shop.name}</h2>
        <p className="text-sm opacity-75 mt-1">
          {generateInvoiceNumber(invoice.id)}
        </p>
        <p className="text-xs opacity-60 mt-0.5">
          {format(new Date(invoice.created_at), 'dd/MM/yyyy HH:mm')}
        </p>
      </div>

      {/* Details */}
      <div className="space-y-1 mb-4 text-sm">
        {invoice.client && (
          <div className="flex justify-between">
            <span className="text-gray-500">{isAr ? 'العميل' : 'Client'}</span>
            <span className="font-medium">{invoice.client.name}</span>
          </div>
        )}
        {invoice.employee && (
          <div className="flex justify-between">
            <span className="text-gray-500">{isAr ? 'الحلاق' : 'Barber'}</span>
            <span className="font-medium">{invoice.employee.name}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">{isAr ? 'الدفع' : 'Payment'}</span>
          <span className="font-medium">{getPaymentMethodLabel(invoice.payment_method, locale)}</span>
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-start py-1.5 font-semibold text-gray-700">
              {isAr ? 'الخدمة' : 'Service'}
            </th>
            <th className="text-center py-1.5 font-semibold text-gray-700">
              {isAr ? 'الكمية' : 'Qty'}
            </th>
            <th className="text-end py-1.5 font-semibold text-gray-700">
              {isAr ? 'السعر' : 'Price'}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.invoice_items?.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-1.5">{item.name_snapshot}</td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-end">
                {formatCurrency(item.price_snapshot * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{isAr ? 'المجموع' : 'Subtotal'}</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>
        {invoice.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>{isAr ? 'خصم' : 'Discount'}</span>
            <span>- {formatCurrency(invoice.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
          <span>{isAr ? 'الإجمالي الصافي' : 'Net Total'}</span>
          <span>{formatCurrency(invoice.net_total)}</span>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-gray-400 text-xs mt-5">
        {isAr ? 'شكراً لزيارتكم' : 'Thank you for your visit'}
      </p>
    </div>
  );
}
