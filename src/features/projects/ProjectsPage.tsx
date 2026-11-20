import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { EmptyState, Page, PageBody } from "@/components/system";
import { errorText } from "@/api/homelab";
import { getProject, listProjects, type Project } from "@/api/projects";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { useNavStore } from "@/store/navStore";
import { CardSheet, openCardSheet } from "@/features/backlog/CardSheet";
import { ProjectPlans } from "@/features/plans/ProjectPlans";
import { ProjectDispatchRuns } from "./ProjectDispatchRuns";
import { NewProjectForm } from "./NewProjectForm";
import { ProjectEditor } from "./ProjectEditor";
import { ProjectWidget } from "@/widgets/ProjectWidget";
import { ProjectsWidget } from "@/widgets/ProjectsWidget";

const REFRESH_MS = 10_000;

export function ProjectsPage() {
  const navProject = useNavStore((s) => s.open["work:projects"]);
  const slug = navProject?.kind === "project" ? navProject.id : null;
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tied to the project it was started on, so a project opened from a link or the palette opens
  // read-only even while another was being edited.
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const editing = slug !== null && editingSlug === slug;
  const [creating, setCreating] = useState(false);
  const [creatingOn, setCreatingOn] = useState(slug);
  if (creatingOn !== slug) {
    setCreatingOn(slug);
    setCreating(false);
  }
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      if (slug) {
        const next = await getProject(slug);
        if (id === requestId.current) setProject(next);
      } else {
        const next = await listProjects();
        if (id === requestId.current) setProjects(next);
      }
      if (id === requestId.current) setError(null);
    } catch (err) {
      if (id === requestId.current) setError(errorText(err));
    }
  }, [slug]);

  // Previous data stays on screen while a refetch runs, so a poll never flashes a spinner.
  useEffect(() => {
    load();
    const tick = () => !document.hidden && load();
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [load]);

  function open(next: string, edit = false) {
    setProject(null);
    setEditingSlug(edit ? next : null);
    useNavStore.getState().openItem({ kind: "project", id: next });
  }

  function back() {
    setEditingSlug(null);
    useNavStore.getState().closeItem("project");
  }

  const shown = project && project.slug === slug ? project : null;

  return (
    <Page>
      <PageBody>
        <ToolsRow
          action={
            slug
              ? shown && !editing
                ? { label: "Edit", icon: Pencil, onClick: () => setEditingSlug(slug) }
                : undefined
              : !creating
                ? { label: "New project", onClick: () => setCreating(true) }
                : undefined
          }
        />
        {error && <p className="text-meta text-err">Couldn't load projects: {error}</p>}
        {slug ? (
          shown ? (
            editing ? (
              <ProjectEditor project={shown} onChanged={load} onDone={() => setEditingSlug(null)} />
            ) : (
              <>
                <ProjectWidget {...shown} onBack={back} onOpenCard={openCardSheet} />
                <ProjectPlans project={shown.slug} />
                <ProjectDispatchRuns runs={shown.dispatch_runs ?? []} />
                <CardSheet view="work:projects" cards={shown.workstreams.flatMap((w) => w.cards ?? [])} onChanged={load} />
              </>
            )
          ) : (
            !error && <p className="text-meta text-muted">Loading…</p>
          )
        ) : projects ? (
          <>
            {creating && (
              <NewProjectForm
                onCancel={() => setCreating(false)}
                onCreated={(p) => {
                  setCreating(false);
                  open(p.slug, true);
                }}
              />
            )}
            {projects.length === 0 ? (
              <EmptyState title="No projects yet">Projects group a plan's workstreams and their cards.</EmptyState>
            ) : (
              <ProjectsWidget projects={projects} onOpen={(s) => open(s)} />
            )}
          </>
        ) : (
          !error && <p className="text-meta text-muted">Loading…</p>
        )}
        {slug && error && (
          <button
            type="button"
            onClick={back}
            className="inline-flex min-h-11 items-center self-start text-meta text-primary hover:underline sm:min-h-0"
          >
            Back to projects
          </button>
        )}
      </PageBody>
    </Page>
  );
}
