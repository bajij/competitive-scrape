// projectReportsPage / pageRapportsProjet :
// page serveur pour afficher les rapports d'un projet.
// Server page to display reports of a project.

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ProjectReportsPageClient, {
  type ProjectInfo,
  type ReportSummary,
} from './ProjectReportsPageClient';

// PageProps / propsPage : params contient projectId sous forme de Promise (Next 16)
// Page props: params contains projectId as a Promise (Next 16)
type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

// normalizeHighlights / normaliserFaitsMarquants :
// sécurise le JSON stocké en base pour le transformer en faits marquants IA.
// Safely normalizes stored JSON into AI highlight items.
function normalizeHighlights(
  raw: unknown,
): ReportSummary['highlights'] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const obj = item as any;
    return {
      title: typeof obj?.title === 'string' ? obj.title : '',
      detail: typeof obj?.detail === 'string' ? obj.detail : '',
      competitor:
        typeof obj?.competitor === 'string'
          ? obj.competitor
          : '',
      changeType:
        typeof obj?.changeType === 'string'
          ? obj.changeType
          : '',
      impact:
        typeof obj?.impact === 'string' ? obj.impact : '',
    };
  });
}

export default async function ProjectReportsPage({
  params,
}: PageProps) {
  const { projectId } = await params;

  const id = Number(projectId);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  if (!project) {
    notFound();
  }

  const reports = await prisma.report.findMany({
    where: { projectId: id },
    orderBy: { generatedAt: 'desc' },
  });

  const initialReports: ReportSummary[] = reports.map((report) => ({
    id: report.id,
    projectId: report.projectId,
    periodStart: report.periodStart
      ? report.periodStart.toISOString()
      : null,
    periodEnd: report.periodEnd
      ? report.periodEnd.toISOString()
      : null,
    generatedAt: report.generatedAt.toISOString(),
    aiSummary: report.aiSummary,
    highlights: normalizeHighlights(report.highlights as unknown),
  }));

  const projectInfo: ProjectInfo = {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">
        Rapports de veille – {project.name}
      </h1>
      <p className="text-sm text-slate-300">
        Générer et consulter les rapports (IA) de changements pour ce
        projet. / Generate and review AI-powered change reports for
        this project.
      </p>

      <ProjectReportsPageClient
        project={projectInfo}
        initialReports={initialReports}
      />
    </main>
  );
}
