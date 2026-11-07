import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyState, Page, PageBody, PageHeader } from "@/components/system";
import { errorText } from "@/api/homelab";
import { getProject, listProjects, type Project } from "@/api/projects";
import { ProjectPlans } from "@/features/plans/ProjectPlans";
import { Button } from "@/components/ui/button";
import { NewProjectForm } from "./NewProjectForm";
import { ProjectEditor } from "./ProjectEditor";
import { useUiStore } from "@/store/uiStore";
import { ProjectWidget } from "@/widgets/ProjectWidget";
import { ProjectsWidget } from "@/widgets/ProjectsWidget";

const REFRESH_MS = 10_000;

export function ProjectsPage() {
  const [slug, setSlug] = useState<string | null>(() => useUiStore.getState().linkedProject);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    useUiStore.getState().setLinkedProject(null);
  }, []);

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
    setEditing(edit);
    setSlug(next);
  }

  function back() {
    setEditing(false);
    setSlug(null);
  }

  const shown = project && project.slug === slug ? project : null;

  return (
    <Page>
      <PageHeader
        title="Projects"
        actions={
          slug ? (
            shown && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          ) : (
            !creating && (
              <Button size="sm" onClick={() => setCreating(true)}>
                New project
              </Button>
            )
          )
        }
      />
      <PageBody>
        {error && <p className="text-meta text-err">Couldn't load projects: {error}</p>}
        {slug ? (
          shown ? (
            editing ? (
              <ProjectEditor project={shown} onChanged={load} onDone={() => setEditing(false)} />
            ) : (
              <>
                <ProjectWidget {...shown} onBack={back} />
                <ProjectPlans project={shown.slug} />
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
          <button type="button" onClick={back} className="self-start text-meta text-primary hover:underline">
            Back to projects
          </button>
        )}
      </PageBody>
    </Page>
  );
}
