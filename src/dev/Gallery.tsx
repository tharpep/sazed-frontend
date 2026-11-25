import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, Plus } from "lucide-react";

import { EmptyState, ListRow, ListSection, Segmented, StatusPill, type Tone } from "@/components/system";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const componentFiles = Object.keys(
  import.meta.glob(["../components/ui/*.tsx", "../components/system/*.tsx"])
)
  .map((path) => path.replace("../components/", "").replace(".tsx", ""))
  .filter((name) => name !== "system/index")
  .sort();

const BUTTON_VARIANTS = ["default", "outline", "ghost", "secondary", "destructive", "link"] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;
const BADGE_VARIANTS = ["default", "secondary", "outline", "ghost", "destructive"] as const;
const TONES: Tone[] = ["neutral", "accent", "ok", "warn", "err"];
const MODELS = [
  { value: "sonnet", label: "Sonnet 5.5" },
  { value: "opus", label: "Opus 5.5" },
  { value: "haiku", label: "Haiku 5.5" },
];
const RUNS = [
  { name: "Morning brief", model: "Sonnet 5.5", cost: "$0.04", took: "12s" },
  { name: "Backlog scout", model: "Opus 5.5", cost: "$0.31", took: "2m 4s" },
  { name: "Inbox triage", model: "Haiku 5.5", cost: "$0.01", took: "6s" },
];

function SegmentedDemo() {
  const [value, setValue] = useState<"all" | "needs" | "errors">("all");
  return (
    <Segmented
      label="Filter"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "Everything" },
        { value: "needs", label: "Needs you", count: 2 },
        { value: "errors", label: "Errors" },
      ]}
    />
  );
}

const demos: Record<string, () => ReactNode> = {
  "system/EmptyState": () => (
    <EmptyState title="No automations yet" action={{ label: "New automation", onClick: () => {} }}>
      Automations you create show up here with their schedule and last run.
    </EmptyState>
  ),
  "system/List": () => (
    <ListSection title="Today">
      <ListRow
        leading={<Bell className="text-muted" />}
        title="Morning brief"
        description="Sent to your phone with 3 events and 2 tasks."
        time="07:00"
        meta={<span>12s</span>}
      />
      <ListRow
        leading={<Bell className="text-err" />}
        title="Backlog scout"
        description="Failed at the second opinion step."
        time="06:30"
        meta={<span>2m 4s</span>}
        onClick={() => {}}
      />
    </ListSection>
  ),
  "system/Page": () => (
    <p className="text-meta text-ink-2">
      Page and PageBody frame every page, including this one: a full-height column with a scrolling body, 1024px wide
      at most.
    </p>
  ),
  "system/Segmented": () => <SegmentedDemo />,
  "system/StatusPill": () => (
    <div className="flex flex-wrap gap-2">
      {TONES.map((tone) => (
        <StatusPill key={tone} tone={tone} pulse={tone === "accent"}>
          {tone}
        </StatusPill>
      ))}
    </div>
  ),
  "ui/avatar": () => (
    <Avatar>
      <AvatarFallback>PT</AvatarFallback>
    </Avatar>
  ),
  "ui/badge": () => (
    <div className="flex flex-wrap gap-2">
      {BADGE_VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
  "ui/button": () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button disabled>disabled</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {BUTTON_SIZES.map((size) => (
          <Button key={size} variant="outline" size={size}>
            <Plus aria-hidden="true" />
            {size}
          </Button>
        ))}
        <Button variant="outline" size="icon" aria-label="Add">
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </div>
  ),
  "ui/dialog": () => (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “Morning brief”?</DialogTitle>
          <DialogDescription>Its run history is deleted too. This can't be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  "ui/dropdown-menu": () => (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>
        Actions
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuItem>Run now</DropdownMenuItem>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  "ui/field": () => (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor="gallery-name">Name</FieldLabel>
        <Input id="gallery-name" placeholder="Morning brief" />
        <FieldDescription>Shown in Activity and on your phone.</FieldDescription>
      </Field>
      <Field data-invalid>
        <FieldLabel htmlFor="gallery-cron">Schedule</FieldLabel>
        <Input id="gallery-cron" defaultValue="every day at" aria-invalid />
        <FieldError>Add a time, such as “every day at 7am”.</FieldError>
      </Field>
      <Field orientation="horizontal">
        <Switch id="gallery-push" defaultChecked />
        <FieldLabel htmlFor="gallery-push">Send to phone</FieldLabel>
      </Field>
    </FieldGroup>
  ),
  "ui/input": () => (
    <div className="flex max-w-sm flex-col gap-2">
      <Input placeholder="Search notes" />
      <Input defaultValue="Disabled" disabled />
    </div>
  ),
  "ui/label": () => <Label>Timezone</Label>,
  "ui/scroll-area": () => (
    <ScrollArea className="h-24 max-w-sm rounded-md border border-line">
      <div className="flex flex-col gap-1 p-3 text-meta text-ink-2">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>Step {i + 1}</span>
        ))}
      </div>
    </ScrollArea>
  ),
  "ui/select": () => (
    <Select items={MODELS} defaultValue="sonnet">
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
  "ui/separator": () => (
    <div className="flex max-w-sm flex-col gap-2 text-meta text-ink-2">
      Above
      <Separator />
      Below
    </div>
  ),
  "ui/sheet": () => (
    <Sheet>
      <SheetTrigger className={buttonVariants({ variant: "outline" })}>Open sheet</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Morning brief</SheetTitle>
          <SheetDescription>Runs every day at 7am and sends to your phone.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  "ui/switch": () => (
    <div className="flex items-center gap-3">
      <Switch defaultChecked aria-label="On" />
      <Switch aria-label="Off" />
      <Switch size="sm" defaultChecked aria-label="Small" />
    </div>
  ),
  "ui/table": () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Model</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Took</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {RUNS.map((run) => (
          <TableRow key={run.name}>
            <TableCell className="font-medium text-ink">{run.name}</TableCell>
            <TableCell className="text-ink-2">{run.model}</TableCell>
            <TableCell className="text-right font-mono text-ink-2">{run.cost}</TableCell>
            <TableCell className="text-right font-mono text-ink-2">{run.took}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  "ui/tabs": () => (
    <Tabs defaultValue="plans">
      <TabsList>
        <TabsTrigger value="plans">Plans</TabsTrigger>
        <TabsTrigger value="runs">Dispatch runs</TabsTrigger>
      </TabsList>
      <TabsContent value="plans" className="text-meta text-ink-2">
        Segmented is the control for switching views; Tabs is here only because it is installed.
      </TabsContent>
      <TabsContent value="runs" className="text-meta text-ink-2">
        Dispatch runs
      </TabsContent>
    </Tabs>
  ),
  "ui/textarea": () => <Textarea className="max-w-sm" placeholder="What should Sazed do?" />,
  "ui/tooltip": () => (
    <Tooltip>
      <TooltipTrigger className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Notifications">
        <Bell aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>Notifications</TooltipContent>
    </Tooltip>
  ),
};

export const undemonstrated = componentFiles.filter((name) => !(name in demos));

export function Gallery() {
  return (
    <>
      {undemonstrated.length > 0 && (
        <p role="alert" className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-meta text-ink">
          Not in the gallery yet: <span className="font-mono">{undemonstrated.join(", ")}</span>. Add a demo for each in
          src/dev/Gallery.tsx.
        </p>
      )}
      {componentFiles
        .filter((name) => name in demos)
        .map((name) => (
          <section key={name} id={name} className="flex flex-col gap-1.5">
            <h2 className="px-0.5 font-mono text-meta text-muted">@/components/{name}</h2>
            <div className="rounded-lg border border-line bg-surface p-4">{demos[name]()}</div>
          </section>
        ))}
    </>
  );
}
