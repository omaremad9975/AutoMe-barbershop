'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Sparkles, X, KeyRound, BarChart2, Search, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ─── UPDATE THIS every time you release new features ───────────────────────
const CURRENT_VERSION = '1.2';

const WHATS_NEW: { ar: string; en: string; icon: React.ReactNode }[] = [
  {
    icon: <KeyRound className="w-5 h-5 text-blue-500" />,
    ar: 'تغيير كلمة المرور من صفحة الإعدادات — مع التحقق من كلمة المرور القديمة أولاً',
    en: 'Change password from Settings — with old password verification first',
  },
  {
    icon: <BarChart2 className="w-5 h-5 text-green-500" />,
    ar: 'صفحة الحسابات: تتبع مصاريف المحل وتقاريرها',
    en: 'Accounts page: track and report shop expenses',
  },
  {
    icon: <Search className="w-5 h-5 text-purple-500" />,
    ar: 'البحث عن العملاء في نافذة المواعيد',
    en: 'Search clients in the appointments modal',
  },
  {
    icon: <FileCheck className="w-5 h-5 text-amber-500" />,
    ar: 'إصلاح ملخص الوردية — يظهر الآن جميع الفواتير بشكل صحيح',
    en: 'Shift summary fix — all invoices now appear correctly',
  },
];
// ───────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'autome-whats-new-version';

export function WhatsNewModal() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d5e] px-8 py-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-medium uppercase tracking-widest">
                {locale === 'ar' ? `الإصدار ${CURRENT_VERSION}` : `Version ${CURRENT_VERSION}`}
              </p>
              <h2 className="text-white font-bold text-2xl leading-tight mt-0.5">
                {locale === 'ar' ? 'ما الجديد؟ ✨' : "What's New ✨"}
              </h2>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature list */}
        <div className="px-8 py-6 space-y-4">
          {WHATS_NEW.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1.5">
                {locale === 'ar' ? item.ar : item.en}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7">
          <Button onClick={dismiss} size="lg" className="w-full">
            {locale === 'ar' ? 'فهمت، شكراً! 👍' : "Got it, thanks! 👍"}
          </Button>
        </div>

      </div>
    </div>
  );
}
