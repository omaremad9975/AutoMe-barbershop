'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Stage = 'idle' | 'locating' | 'sending' | 'result';

type PunchResult =
  | { success: true; action: 'check_in' | 'check_out'; staff_name: string; time: string; distance_m: number }
  | { success: false; error: string; distance_m?: number; allowed_m?: number; staff_name?: string };

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PIN_FORMAT: 'اكتب رمز مكوّن من 4 أرقام',
  INVALID_LOCATION: 'تعذر تحديد موقعك، فعّل الـ GPS وحاول تاني',
  SHOP_NOT_FOUND: 'المحل غير موجود، تأكد من الرابط',
  WRONG_PIN: 'الرمز غير صحيح، حاول مرة تانية',
  TOO_MANY_ATTEMPTS: 'محاولات كتير غلط، استنى 15 دقيقة وحاول تاني',
};

export default function SelfPunchPage() {
  const params = useParams<{ slug: string }>();
  return (
    <Shell>
      <AttendanceView slug={params.slug} />
    </Shell>
  );
}

function AttendanceView({ slug }: { slug: string }) {
  const [pin, setPin] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<PunchResult | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  function pressDigit(d: string) {
    if (pin.length >= 4 || stage !== 'idle') return;
    setPin(pin + d);
  }
  function backspace() {
    if (stage !== 'idle') return;
    setPin(pin.slice(0, -1));
  }

  async function submit() {
    if (pin.length !== 4) return;
    setLocError(null);
    setStage('locating');

    if (!('geolocation' in navigator)) {
      setLocError('جهازك لا يدعم تحديد الموقع');
      setStage('idle');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStage('sending');
        const supabase = createClient();
        const { data, error } = await supabase.rpc('staff_self_punch', {
          p_slug: slug,
          p_pin: pin,
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
        });
        if (error) {
          setResult({ success: false, error: 'UNKNOWN' });
        } else {
          setResult(data as PunchResult);
        }
        setStage('result');
      },
      () => {
        setLocError('لازم تسمح بالوصول لموقعك (GPS) عشان تسجل حضورك');
        setStage('idle');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function reset() {
    setPin('');
    setResult(null);
    setLocError(null);
    setStage('idle');
  }

  if (stage === 'result' && result) {
    const ok = result.success;
    return (
      <div className="text-center px-6">
        <div className="text-6xl mb-4">{ok ? (result.action === 'check_in' ? '✅' : '👋') : '⚠️'}</div>
        {ok ? (
          <>
            <div className="text-2xl font-extrabold text-white mb-1">
              {result.action === 'check_in' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف'}
            </div>
            <div className="text-white/80 font-bold">{result.staff_name}، الساعة {result.time}</div>
          </>
        ) : (
          <>
            <div className="text-2xl font-extrabold text-white mb-2">
              {result.error === 'TOO_FAR' ? 'أنت بعيد عن المحل' : (ERROR_MESSAGES[result.error] || 'حدث خطأ، حاول تاني')}
            </div>
            {result.error === 'TOO_FAR' && (
              <div className="text-white/80 font-bold">
                المسافة الحالية: {result.distance_m}م، المسموح: {result.allowed_m}م
              </div>
            )}
          </>
        )}
        <button
          onClick={reset}
          className="mt-8 bg-white text-indigo-700 font-extrabold rounded-2xl px-8 py-3 text-lg active:scale-95 transition-transform"
        >
          حسنًا
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6 px-6">
        <div className="text-white/80 font-bold text-sm mb-1">تسجيل الحضور والانصراف</div>
        <div className="text-white font-extrabold text-lg">اكتب رمزك السري (4 أرقام)</div>
      </div>
      <div className="flex items-center justify-center gap-3 mb-8" dir="ltr">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={'w-4 h-4 rounded-full border-2 border-white ' + (pin.length > i ? 'bg-white' : 'bg-transparent')}
          />
        ))}
      </div>
      {locError && (
        <div className="mx-6 mb-4 bg-red-500/20 border border-red-300/40 text-white text-sm font-bold rounded-xl px-4 py-2.5 text-center">
          {locError}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 px-6 max-w-xs mx-auto w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            disabled={stage !== 'idle'}
            className="aspect-square rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-2xl font-extrabold"
          >
            {d}
          </button>
        ))}
        <button
          onClick={backspace}
          disabled={stage !== 'idle'}
          className="aspect-square rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-xl font-bold"
        >
          ⌫
        </button>
        <button
          onClick={() => pressDigit('0')}
          disabled={stage !== 'idle'}
          className="aspect-square rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-2xl font-extrabold"
        >
          0
        </button>
        <button
          onClick={submit}
          disabled={pin.length !== 4 || stage !== 'idle'}
          className="aspect-square rounded-2xl bg-white text-indigo-700 disabled:opacity-30 hover:bg-indigo-50 active:scale-95 transition-all text-2xl font-extrabold"
        >
          ✓
        </button>
      </div>
      <div className="text-center mt-8 text-white/60 text-xs font-bold px-6">
        {stage === 'locating' && 'جارٍ تحديد موقعك...'}
        {stage === 'sending' && 'جارٍ تسجيل البيانات...'}
        {stage === 'idle' && 'لازم تكون في المحل عشان يتسجل حضورك'}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-600 to-indigo-800 py-10" dir="rtl">
      {children}
    </div>
  );
}
