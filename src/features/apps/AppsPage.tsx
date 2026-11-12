import { useEffect, useState } from "react";

import { errorText, fetchServices, type Service } from "@/api/homelab";
import { Page, PageBody, PageHeader } from "@/components/system";
import { AppGrid } from "@/features/apps/AppGrid";
import { useShellStore } from "@/nav/shellFlag";

export function AppsPage() {
  // The hub shell's header and title row already name the page.
  const shell = useShellStore((s) => s.shell);
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices()
      .then((r) => setServices(r.services))
      .catch((e) => setError(errorText(e)));
  }, []);

  return (
    <Page>
      {shell === "old" && <PageHeader title="Apps" />}
      <PageBody className="max-w-none">
        {error && <p className="text-meta text-err">Couldn't load apps: {error}</p>}
        {!services && !error && <p className="text-meta text-muted">Loading…</p>}
        {services && <AppGrid services={services} />}
      </PageBody>
    </Page>
  );
}
