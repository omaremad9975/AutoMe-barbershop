'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DEMO_SHOP } from '@/lib/demo/data';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Client } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
  shopId: string;
  clients: Client[];
}

export function QuickAddClient({ open, onClose, onCreated, shopId, clients }: Props) {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const maxCode = clients.reduce((max, c) => (c.code != null && c.code > max ? c.code : max), 0);
      setCode(String(maxCode + 1));
      setName('');
      setPhone('');
      setEmail('');
      setFieldErrors({});
    }
  }, [open, clients]);

  async function handleSave() {
    const errs: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      errs.name = locale === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    }

    // Phone validation
    if (!phone.trim()) {
      errs.phone = locale === 'ar' ? 'الهاتف مطلوب' : 'Phone is required';
    } else {
      const egPhoneRegex = /^01[0125]\d{8}$/;
      if (!egPhoneRegex.test(phone.trim())) {
        errs.phone = locale === 'ar'
          ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)'
          : 'Please enter a valid Egyptian phone number (e.g. 01012345678)';
      }
    }

    // Email validation
    if (!email.trim()) {
      errs.email = locale === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = locale === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح'
          : 'Please enter a valid email address';
      }
    }

    // Code validation
    if (!code.trim()) {
      errs.code = locale === 'ar' ? 'الكود مطلوب' : 'Code is required';
    } else {
      const parsedCode = parseInt(code, 10);
      if (isNaN(parsedCode) || parsedCode < 1) {
        errs.code = locale === 'ar' ? 'الكود يجب أن يكون رقماً أكبر من 0' : 'Code must be a number greater than 0';
      } else {
        const duplicate = clients.find((c) => c.code === parsedCode);
        if (duplicate) {
          errs.code = locale === 'ar'
            ? 'هذا الكود مستخدم بالفعل. يرجى اختيار كود آخر.'
            : 'This code is already taken. Please choose a different one.';
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    const clientCode = code ? parseInt(code, 10) : null;

    if (DEMO_MODE) {
      const fakeClient: Client = {
        id: 'demo-client-' + Math.random().toString(36).slice(2, 8),
        shop_id: DEMO_SHOP.id,
        name: name.trim(),
        phone: phone.trim() || null,
        whatsapp: phone.trim() || null,
        email: email.trim() || null,
        notes: null,
        code: clientCode || undefined,
        created_at: new Date().toISOString(),
      };
      toast.success(tCommon('success'));
      onCreated(fakeClient);
      setName('');
      setPhone('');
      setEmail('');
      setCode('');
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .insert({ shop_id: shopId, name: name.trim(), phone: phone.trim() || null, whatsapp: phone.trim() || null, email: email.trim() || null, code: clientCode })
      .select()
      .single<Client>();

    if (error || !data) {
      toast.error(tCommon('error'));
    } else {
      toast.success(tCommon('success'));
      onCreated(data);
      setName('');
      setPhone('');
      setEmail('');
      setCode('');
    }
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('newClient')} size="sm">
      <div className="space-y-4">
        <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} error={fieldErrors.name} />
        <Input
          label={locale === 'ar' ? 'الهاتف (واتساب)' : 'Phone (WhatsApp)'}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01xxxxxxxxx"
          type="tel"
          error={fieldErrors.phone}
        />
        <Input label={tCommon('email')} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" type="email" error={fieldErrors.email} />
        <Input
          label={locale === 'ar' ? 'الكود' : 'Code'}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          type="number"
          min={1}
          error={fieldErrors.code}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">{tCommon('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? tCommon('loading') : tCommon('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
