import { createClient } from '@/lib/supabase/server';
import { AppointmentsClient } from '@/components/appointments/AppointmentsClient';
import { DEMO_APPOINTMENTS, DEMO_CLIENTS, DEMO_EMPLOYEES, DEMO_SERVICES } from '@/lib/demo/data';
import type { Appointment, Client, Employee, Service } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function AppointmentsPage() {
  const today = new Date().toISOString().split('T')[0];

  if (DEMO_MODE) {
    return (
      <AppointmentsClient
        initialAppointments={DEMO_APPOINTMENTS}
        initialClients={DEMO_CLIENTS as Client[]}
        initialEmployees={DEMO_EMPLOYEES}
        initialServices={DEMO_SERVICES as Service[]}
        initialDate={today}
      />
    );
  }

  const supabase = createClient();
  const [{ data: appointments }, { data: clients }, { data: employees }, { data: services }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('*, client:clients(id,name,phone), employee:employees(id,name), service:services(id,name_ar,name_en,price,duration_minutes)')
        .eq('date', today).order('time'),
      supabase.from('clients').select('id,name,phone').order('name'),
      supabase.from('employees').select('id,name').eq('active', true).order('name'),
      supabase.from('services').select('id,name_ar,name_en,price,duration_minutes').eq('active', true).order('name_ar'),
    ]);

  return (
    <AppointmentsClient
      initialAppointments={(appointments ?? []) as Appointment[]}
      initialClients={(clients ?? []) as Client[]}
      initialEmployees={(employees ?? []) as Employee[]}
      initialServices={(services ?? []) as Service[]}
      initialDate={today}
    />
  );
}
