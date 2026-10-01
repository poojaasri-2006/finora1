'use client';

import { useEffect, useState } from 'react';

export function useOrganizationCurrency() {
  const [currency, setCurrency] = useState('USD');
  useEffect(() => {
    let active = true;
    fetch('/api/settings').then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.organization?.baseCurrency) setCurrency(data.organization.baseCurrency); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return currency;
}
