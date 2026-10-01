import { DashboardV3 } from '@/components/dashboard/dashboard-v3';
import { GET as getDashboard } from '@/app/api/dashboard/route';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initialData = null;
  try {
    const response = await getDashboard();
    if (response.ok) initialData = await response.json();
  } catch {
    initialData = null;
  }
  return <DashboardV3 initialData={initialData} />;
}
