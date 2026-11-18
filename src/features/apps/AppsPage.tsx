import { useEffect, useState } from "react";

import { errorText, fetchServices, type Service } from "@/api/homelab";
import { Page, PageBody } from "@/components/system";
import { AppGrid } from "@/features/apps/AppGrid";

export function AppsPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices()
      .then((r) => setServices(r.services))
      .catch((e) => setError(errorText(e)));
  }, []);

  return (
    <Page>
      <PageBody className="max-w-none">
        {error && <p className="text-meta text-err">Couldn't load apps: {error}</p>}
        {!services && !error && <p className="text-meta text-muted">Loading…</p>}
        {services && <AppGrid services={services} />}
      </PageBody>
    </Page>
  );
}
