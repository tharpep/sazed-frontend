import { lazy, Suspense, useMemo, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { EmptyState, ListRow, ListSection, Page, PageBody, Segmented } from "@/components/system";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Gallery } from "./Gallery";
import { mocks } from "./mocks";

const FRAMES = [
  { value: "desktop", label: "Desktop" },
  { value: "phone", label: "Phone" },
] as const;
type Frame = (typeof FRAMES)[number]["value"];

function DevHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2 md:px-8">
      <Link to="/dev" className="text-meta text-ink-2 hover:text-ink">
        Dev
      </Link>
      <h1 className="text-title font-medium text-ink">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        {children}
        <ThemeToggle orientation="horizontal" />
      </div>
    </header>
  );
}

function DevIndex() {
  const navigate = useNavigate();
  const names = Object.keys(mocks).sort();
  return (
    <Page>
      <DevHeader title="Components and mockups" />
      <PageBody>
        <ListSection title="Components">
          <ListRow
            title="Gallery"
            description="Every shared component in src/components/ui and src/components/system."
            onClick={() => navigate("/dev/gallery")}
          />
        </ListSection>
        {names.length ? (
          <ListSection title="Mockups">
            {names.map((name) => (
              <ListRow
                key={name}
                title={name}
                description={mocks[name].map((m) => m.variant).join(", ")}
                onClick={() => navigate(`/dev/mocks/${name}`)}
              />
            ))}
          </ListSection>
        ) : (
          <EmptyState title="No mockups yet">
            Add src/dev/mocks/name.tsx with a default-exported page built on the shared components and made-up data.
            Name variants name.a.tsx, name.b.tsx.
          </EmptyState>
        )}
      </PageBody>
    </Page>
  );
}

function GalleryPage() {
  return (
    <Page>
      <DevHeader title="Gallery" />
      <PageBody>
        <Gallery />
      </PageBody>
    </Page>
  );
}

function MockPage() {
  const { name = "", variant } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const variants = mocks[name];
  const active = variants?.find((m) => m.variant === variant) ?? variants?.[0];
  const Mock = useMemo(() => (active ? lazy(active.load) : null), [active]);

  if (!variants || !active || !Mock) return <Navigate to="/dev" replace />;
  if (variant && variant !== active.variant) {
    return <Navigate to={`/dev/mocks/${name}/${active.variant}?${search}`} replace />;
  }

  const body = (
    <Suspense fallback={null}>
      <Mock />
    </Suspense>
  );
  if (search.has("bare")) return <div className="h-dvh bg-bg">{body}</div>;

  const frame: Frame = search.get("frame") === "phone" ? "phone" : "desktop";
  const mockParams = new URLSearchParams(search);
  mockParams.delete("frame");
  const hrefFor = (nextVariant: string, nextFrame: Frame) => {
    const params = new URLSearchParams(mockParams);
    if (nextFrame === "phone") params.set("frame", "phone");
    return `/dev/mocks/${name}/${nextVariant}?${params}`;
  };
  return (
    <Page>
      <DevHeader title={name}>
        {variants.length > 1 && (
          <Segmented
            label="Variant"
            value={active.variant}
            onChange={(next) => navigate(hrefFor(next, frame))}
            options={variants.map((m) => ({ value: m.variant, label: m.variant }))}
          />
        )}
        <Segmented
          label="Frame"
          value={frame}
          onChange={(next) => navigate(hrefFor(active.variant, next))}
          options={[...FRAMES]}
        />
      </DevHeader>
      {frame === "phone" ? (
        <div className="flex min-h-0 flex-1 justify-center bg-shell p-4">
          <iframe
            title={`${name} on a phone`}
            src={`/dev/mocks/${name}/${active.variant}?bare&${mockParams}`}
            className="h-full max-h-[812px] w-[390px] rounded-xl border border-line bg-bg"
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">{body}</div>
      )}
    </Page>
  );
}

export default function DevRoutes() {
  return (
    <div className="h-dvh bg-bg text-ink">
      <Routes>
        <Route index element={<DevIndex />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="mocks/:name/:variant?" element={<MockPage />} />
        <Route path="*" element={<Navigate to="/dev" replace />} />
      </Routes>
    </div>
  );
}
