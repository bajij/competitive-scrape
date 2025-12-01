// projectDetailPage / pageDetailProjet : vue détaillée d'un projet de veille
// Detailed view for a watch project

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import ProjectCompetitorsPanel from './ProjectCompetitorsPanel';

// parseProjectId / parserIdProjet : convertit le paramètre en nombre et le valide
// Converts the route parameter into a number and validates it
function parseProjectId(projectIdRaw: string): number | null {
  const id = Number(projectIdRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

// Next 16 : params est un Promise, on doit donc faire "await params"
// Next 16: params is a Promise, so we must "await params"
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdRaw } = await params;

  const projectId = parseProjectId(projectIdRaw);

  if (!projectId) {
    notFound();
  }

  // fetchProject / chargerProjet : récupère le projet avec ses concurrents
  // Fetch the project with its competitors
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      competitors: {
        orderBy: { createdAt: 'desc' },
        include: {
          monitoredPages: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs text-slate-400">
              <Link href="/projects" className="hover:underline">
                ← Retour aux projets / Back to projects
              </Link>
            </p>
            <h1 className="text-2xl font-semibold">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-2 text-sm text-slate-300">
                {project.description}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {/* projectMeta / metaProjet : petite info sur le nombre de concurrents */}
              {/* Small meta info about competitors count */}
              {project.competitors.length}{' '}
              {project.competitors.length <= 1
                ? 'concurrent'
                : 'concurrents'}{' '}
              configurés sur ce projet.
            </p>
          </div>

          {/* projectActions / actionsProjet :
              accès rapide aux changements et aux rapports de veille */}
          {/* Quick access to recent changes and watch reports */}
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
              <Link
                href={`/projects/${project.id}/changes`}
                className="inline-flex items-center rounded-lg border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/20"
              >
                Voir les changements récents / View recent changes
              </Link>
              <Link
                href={`/projects/${project.id}/reports`}
                className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-sky-500 hover:bg-sky-500/10"
              >
                Rapports de veille / Watch reports
              </Link>
            </div>
            <p className="max-w-xs text-[11px] text-slate-400 text-right sm:text-right">
              Cette vue regroupe les changements détectés sur toutes les pages
              surveillées du projet (par concurrents, par URL). Utilisez la page
              des rapports de veille pour générer une synthèse sur une période. /
              This view aggregates detected changes across all monitored pages
              (by competitor and URL). Use the reports page to generate a
              period-based summary.
            </p>
          </div>
        </header>

        {/* ProjectCompetitorsPanel / panneauConcurrentsProjet :
            gestion des concurrents pour ce projet */}
        {/* Manage competitors for this project */}
        <ProjectCompetitorsPanel
          projectId={project.id}
          initialCompetitors={project.competitors}
        />
      </div>
    </main>
  );
}
