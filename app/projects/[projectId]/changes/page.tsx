// projectChangesPage / pageChangementsProjet : historique de veille pour un projet
// Project changes page: watch history for a project

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { ChangeType, PageType } from '@prisma/client';

// parseProjectId / parserIdProjet : convertit et valide l'id projet
// Converts and validates the project id
function parseProjectId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

// labelsTypePage / libellesTypePage : affichage lisible des types de page
// Human-readable labels for page types
const PAGE_TYPE_LABELS: Record<PageType, string> = {
  PRICING: 'Pricing / Tarifs',
  LANDING: 'Landing / Page principale',
  PRODUCT: 'Produit / Offre',
  BLOG: 'Blog / Contenu',
  OTHER: 'Autre',
};

// labelsTypeChangement / libellesTypeChangement : affichage lisible des types de changement
// Human-readable labels for change types
const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  TEXT: 'Changement de texte',
  PRICE: 'Changement de prix',
  SECTION_ADDED: 'Section ajoutée',
  SECTION_REMOVED: 'Section supprimée',
  OTHER: 'Autre changement',
};

export default async function ProjectChangesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // unwrapParams / recupererParams : Next 16 -> params est un Promise
  // unwrapParams: Next 16 -> params is a Promise
  const { projectId: rawProjectId } = await params;
  const projectId = parseProjectId(rawProjectId);

  if (!projectId) {
    notFound();
  }

  // fetchProject / chargerProjet : on récupère juste les métadonnées
  // Fetch basic project metadata
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  if (!project) {
    notFound();
  }

  // computeSinceDate / calculDateDepuis : ici on prend les 7 derniers jours
  // Compute "since" date: last 7 days
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 7);

  // fetchChanges / chargerChangements :
  // on récupère les changements liés aux pages dont le concurrent appartient au projet
  // Fetch changes for pages whose competitor belongs to this project
  const changes = await prisma.change.findMany({
    where: {
      createdAt: {
        gte: sinceDate,
      },
      monitoredPage: {
        competitor: {
          projectId,
        },
      },
    },
    include: {
      monitoredPage: {
        select: {
          url: true,
          pageType: true,
          competitor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // maxResults / maxResultats : limite de sécurité
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="mb-1 text-xs text-slate-400">
            <Link href="/projects" className="hover:underline">
              ← Retour aux projets / Back to projects
            </Link>{' '}
            ·{' '}
            <Link
              href={`/projects/${project.id}`}
              className="hover:underline"
            >
              Retour au projet / Back to project
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">
            Historique des changements
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Projet :{' '}
            <span className="font-medium">
              {project.name}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Période couverte : 7 derniers jours. / Covered period: last 7 days.
          </p>
          {project.description && (
            <p className="mt-2 text-xs text-slate-400">
              {project.description}
            </p>
          )}
        </header>

        {changes.length === 0 ? (
          <p className="text-sm text-slate-300">
            Aucun changement détecté sur les pages surveillées de ce projet
            sur les 7 derniers jours. / No changes detected on monitored pages
            for this project in the last 7 days.
          </p>
        ) : (
          <section className="space-y-3">
            <p className="text-xs text-slate-400">
              {changes.length}{' '}
              {changes.length <= 1
                ? 'changement récent'
                : 'changements récents'}
              .
            </p>

            <ul className="flex flex-col gap-3">
              {changes.map((change) => {
                const oldPreview = (change.oldValue ?? '').slice(0, 600);
                const newPreview = (change.newValue ?? '').slice(0, 600);
                const hasContent = oldPreview || newPreview;

                return (
                  <li
                    key={change.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <p className="text-xs font-semibold text-slate-100">
                            {CHANGE_TYPE_LABELS[change.changeType]}
                          </p>
                          {change.changeSummary && (
                            <p className="mt-0.5 text-xs text-slate-300">
                              {change.changeSummary}
                            </p>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Le{' '}
                          {new Date(change.createdAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>

                      <div className="mt-1 border-t border-slate-800 pt-2 text-[11px] text-slate-300">
                        <p>
                          Concurrent :{' '}
                          <span className="font-medium">
                            {change.monitoredPage.competitor.name}
                          </span>
                        </p>
                        <p className="mt-0.5">
                          Type de page :{' '}
                          <span className="font-medium">
                            {PAGE_TYPE_LABELS[change.monitoredPage.pageType]}
                          </span>
                        </p>
                        <p className="mt-0.5">
                          URL :{' '}
                          <a
                            href={change.monitoredPage.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline break-all"
                          >
                            {change.monitoredPage.url}
                          </a>
                        </p>
                      </div>

                      {/* diffPreview / apercuDiff : affichage Avant / Après du texte */}
                      {/* Diff preview: Before / After text */}
                      {hasContent && (
                        <details className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                          <summary className="cursor-pointer text-[11px] text-slate-200">
                            Voir le détail du contenu / View content diff
                          </summary>
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[10px] font-semibold text-slate-400">
                                Avant / Before
                              </p>
                              <div className="whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-900/80 p-2 text-[11px] text-slate-200">
                                {oldPreview || '—'}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-semibold text-slate-400">
                                Après / After
                              </p>
                              <div className="whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-900/80 p-2 text-[11px] text-slate-200">
                                {newPreview || '—'}
                              </div>
                            </div>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Aperçu limité à 600 caractères. / Preview limited to
                            600 characters.
                          </p>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
