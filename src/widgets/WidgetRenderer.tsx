import { useEffect, useMemo } from "react";
import * as z from "zod";

import { getWidget } from "./catalog";
import { FallbackCard } from "./FallbackCard";

interface WidgetRendererProps {
  name: string;
  props: Record<string, unknown>;
}

function resolveProps(name: string, props: Record<string, unknown>) {
  const entry = getWidget(name);
  if (!entry) return { error: "Not in the widget catalog." };
  if (entry.live && Object.keys(props).length === 0) return { entry, data: {} };
  const parsed = entry.props.safeParse(props);
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };
  return { entry, data: parsed.data };
}

export function WidgetRenderer({ name, props }: WidgetRendererProps) {
  const resolved = useMemo(() => resolveProps(name, props), [name, props]);
  const { entry, data, error } = resolved;

  useEffect(() => {
    if (error) console.warn(`Widget ${name}: ${error}`);
  }, [name, error]);

  if (!entry) return <FallbackCard name={name} reason={error ?? ""} data={props} />;
  const Component = entry.component;
  return <Component {...data} />;
}
