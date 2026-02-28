import { WIDGET_REGISTRY, type WidgetName } from "./registry";

interface WidgetRendererProps {
  name: string;
  props: Record<string, unknown>;
}

export function WidgetRenderer({ name, props }: WidgetRendererProps) {
  const entry = WIDGET_REGISTRY[name as WidgetName];
  if (!entry) return null;
  const Component = entry.component;
  return <Component {...props} />;
}
