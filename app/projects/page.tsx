// projectsPage / pageProjets : vue principale pour gérer les projets de veille
// Main page to manage watch projects

import { prisma } from '@/lib/db';
import ProjectsPageClient, {
  ProjectSummary,
} from './ProjectsPageClient';

export default async function ProjectsPage() {
  // fetchProjects / chargerProjets : charge les projets avec nombre de concurrents
  // Fetch projects with competitor count
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          competitors: true,
        },
      },
    },
  });

  const initialProjects: ProjectSummary[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    frequency: project.frequency,
    competitorCount: project._count.competitors,
    createdAt: project.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">
            Projets de veille concurrents
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Gérez vos projets de veille : ajoutez des concurrents, surveillez
            leurs pages et analysez les changements avec des rapports de
            veille. / Manage your competitive watch projects: add competitors,
            monitor their pages, and analyse changes with watch reports.
          </p>
        </header>

        <ProjectsPageClient initialProjects={initialProjects} />
      </div>
    </main>
  );
}
