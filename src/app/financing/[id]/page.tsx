import { FinancingDetail } from '@/components/financing/financing-detail';

export default async function FinancingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FinancingDetail id={id} />;
}
