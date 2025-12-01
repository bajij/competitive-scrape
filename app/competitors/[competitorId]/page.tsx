// competitorDetailPage / pageDetailConcurrent : gestion des pages surveillées d'un concurrent
// Competitor detail page: manage monitored pages for a competitor

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import CompetitorPagesPanel from './CompetitorPagesPanel';

// parseCompetitorId / parserIdConcurrent : convertit et valide l'id
// Converts and validates the competitor id
function parseCompetitorId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ competitorId: string }>;
}) {
  // unwrapParams / recupererParams : Next 16 -> params est un Promise
  // unwrapParams: Next 16 -> params is a Promise
  const { competitorId: rawCompetitorId } = await params;
  const competitorId = parseCompetitorId(rawCompetitorId);

  if (!competitorId) {
    notFound();
  }

  // fetchCompetitor / chargerConcurrent : inclut le projet et les pages surveillées
  // Fetch competitor, including project and monitored pages
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: {
      project: true,
      monitoredPages: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!competitor) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6 flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            <Link
              href={`/projects/${competitor.projectId}`}
              className="hover:underline"
            >
              ← Retour au projet / Back to project
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">
            {competitor.name}
          </h1>
          <p className="text-xs text-slate-400">
            Projet :{' '}
            <Link
              href={`/projects/${competitor.projectId}`}
              className="text-sky-400 hover:underline"
            >
              {competitor.project.name}
            </Link>
          </p>
          {competitor.description && (
            <p className="mt-1 text-sm text-slate-300">
              {competitor.description}
            </p>
          )}
        </header>

        <CompetitorPagesPanel
          competitorId={competitor.id}
          initialPages={competitor.monitoredPages}
        />
      </div>
    </main>
  );
}
