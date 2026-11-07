import { useEffect, useState } from "react";

import { errorText, fetchServices, type Service } from "@/api/homelab";
import { Page, PageBody, PageHeader } from "@/components/system";
import { AppGrid } from "@/features/apps/AppGrid";
import { useUiStore } from "@/store/uiStore";

export function AppsPage() {
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices()
      .then((r) => setServices(r.services))
      .catch((e) => setError(errorText(e)));
  }, []);

  return (
    <Page>
      <PageHeader title="Apps" />
      <PageBody>
        {error && <p className="text-meta text-err">Couldn't load apps: {error}</p>}
        {!services && !error && <p className="text-meta text-muted">Loading…</p>}
        {services && <AppGrid services={services.filter((s) => privateRevealed || !s.private)} />}
      </PageBody>
    </Page>
  );
}
