'use client';

import { useState, useEffect, FormEvent } from 'react';

// MonitoredPageType / typePageSurveillee : representation côté client d'une page surveillée
// Client-side representation of a monitored page
export type MonitoredPage = {
  id: number;
  competitorId: number;
  url: string;
  pageType: 'PRICING' | 'LANDING' | 'PRODUCT' | 'BLOG' | 'OTHER';
  note: string | null;
  createdAt: string | Date;
};

// PageChangeType / typeChangementPage : representation côté client d'un changement
// Client-side representation of a change
export type PageChange = {
  id: number;
  monitoredPageId: number;
  changeType: 'TEXT' | 'PRICE' | 'SECTION_ADDED' | 'SECTION_REMOVED' | 'OTHER';
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  changeSummary: string | null;
  createdAt: string | Date;
};

type CompetitorPagesPanelProps = {
  competitorId: number;
  initialPages: MonitoredPage[];
};

// labelsPageType / libellesTypePage : affichage lisible des types de page
// Human-readable labels for page types
const PAGE_TYPE_LABELS: Record<MonitoredPage['pageType'], string> = {
  PRICING: 'Pricing / Tarifs',
  LANDING: 'Landing / Page principale',
  PRODUCT: 'Produit / Offre',
  BLOG: 'Blog / Contenu',
  OTHER: 'Autre',
};

// labelsChangeType / libellesTypeChangement : affichage lisible des types de changement
// Human-readable labels for change types
const CHANGE_TYPE_LABELS: Record<PageChange['changeType'], string> = {
  TEXT: 'Changement de texte',
  PRICE: 'Changement de prix',
  SECTION_ADDED: 'Section ajoutée',
  SECTION_REMOVED: 'Section supprimée',
  OTHER: 'Autre changement',
};

type ChangesState = {
  loading: boolean;
  error: string | null;
  changes: PageChange[] | null;
};

export default function CompetitorPagesPanel({
  competitorId,
  initialPages,
}: CompetitorPagesPanelProps) {
  // pagesState / etatPages : liste des pages surveillées
  // List of monitored pages
  const [pages, setPages] = useState<MonitoredPage[]>(initialPages);

  // loadingState / etatChargement : pour refresh et création
  // Loading state for refresh and creation
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // errorState / etatErreur : message d'erreur global pour cette section
  // Global error message for this section
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // statusMessage / messageStatut : message d'information (succès, info)
  // Info message (success / info)
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // scrapingPageId / idPageEnScraping : pour désactiver le bouton de snapshot en cours
  // To disable the snapshot button for the page currently being scraped
  const [scrapingPageId, setScrapingPageId] = useState<number | null>(null);

  // deletingPageId / idPageSuppression : pour désactiver le bouton de suppression
  // To disable the delete button for the page being deleted
  const [deletingPageId, setDeletingPageId] = useState<number | null>(null);

  // changesByPage / changementsParPage : état des changements pour chaque page
  // Changes state per page
  const [changesByPage, setChangesByPage] = useState<Record<number, ChangesState>>({});

  // expandedPageId / idPageDeveloppee : page dont on affiche l'historique
  // Page for which we show the history
  const [expandedPageId, setExpandedPageId] = useState<number | null>(null);

  // formState / etatFormulaire : champs pour créer une page
  // Form fields for creating a page
  const [url, setUrl] = useState<string>('');
  const [pageType, setPageType] =
    useState<MonitoredPage['pageType']>('OTHER');
  const [note, setNote] = useState<string>('');

  // syncInitial / synchroniserInitial : si le serveur renvoie de nouvelles pages
  // If the server sends new initial pages, sync them
  useEffect(() => {
    setPages(initialPages);
  }, [initialPages]);

  // fetchPages / chargerPages : recharge les pages depuis l'API
  // Reload pages from the API
  async function fetchPages() {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const response = await fetch(`/api/competitors/${competitorId}/pages`);
      if (!response.ok) {
        throw new Error(
          'Erreur lors du chargement des pages surveillées. / Error loading monitored pages.',
        );
      }

      const data = (await response.json()) as MonitoredPage[];
      setPages(data);
    } catch (error) {
      console.error('fetchPagesError / erreurChargementPagesSurveillees', error);
      setErrorMessage(
        'Impossible de charger les pages surveillées. / Unable to load monitored pages.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleCreatePage / gererCreationPage : soumission du formulaire
  // Handle form submission to create a new monitored page
  async function handleCreatePage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = url.trim();
    const trimmedNote = note.trim();

    if (!trimmedUrl) {
      setErrorMessage(
        'L’URL de la page est obligatoire. / Page URL is required.',
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const response = await fetch(`/api/competitors/${competitorId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: trimmedUrl,
          pageType,
          note: trimmedNote || undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(
          errorBody?.message ??
            'Erreur lors de la création de la page surveillée. / Error creating monitored page.',
        );
      }

      const createdPage = (await response.json()) as MonitoredPage;

      // updateList / miseAJourListe : ajouter la nouvelle page en tête
      // Add the new page at the top of the list
      setPages((prev) => [createdPage, ...prev]);

      // resetForm / reinitialiserFormulaire
      setUrl('');
      setPageType('OTHER');
      setNote('');
    } catch (error) {
      console.error('createPageError / erreurCreationPageSurveillee', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la création de la page surveillée. / Error creating monitored page.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleRunSnapshot / gererExecutionSnapshot : déclenche un snapshot pour une page
  // Trigger a snapshot for a given monitored page
  async function handleRunSnapshot(pageId: number) {
    try {
      setScrapingPageId(pageId);
      setErrorMessage(null);
      setStatusMessage(null);

      const response = await fetch(`/api/monitored-pages/${pageId}/scrape`, {
        method: 'POST',
      });

      const body = (await response.json().catch(() => null)) as
        | { message?: string; hasChange?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(
          body?.message ??
            'Erreur lors du snapshot de la page surveillée. / Error running snapshot for monitored page.',
        );
      }

      setStatusMessage(
        body?.message ??
          (body?.hasChange
            ? 'Un changement a été détecté sur cette page. / A change was detected on this page.'
            : 'Snapshot créé, aucun changement majeur détecté. / Snapshot created, no major change detected.'),
      );

      // optionalRefreshChanges / rafraichirChangementsOptionnel :
      // si on affiche déjà les changements pour cette page, on recharge son historique
      // If we are currently showing this page's changes, reload them
      if (expandedPageId === pageId) {
        await loadChangesForPage(pageId, { forceReload: true });
      }
    } catch (error) {
      console.error('runSnapshotError / erreurExecutionSnapshot', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors du snapshot de la page surveillée. / Error running snapshot for monitored page.',
      );
    } finally {
      setScrapingPageId(null);
    }
  }

  // handleDeletePage / gererSuppressionPage : supprime une page + données liées
  // Delete a monitored page + related data
  async function handleDeletePage(pageId: number) {
    const confirmDelete = window.confirm(
      'Supprimer cette page surveillée et tout son historique ? / Delete this monitored page and all its history?',
    );
    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingPageId(pageId);
      setErrorMessage(null);
      setStatusMessage(null);

      const response = await fetch(`/api/monitored-pages/${pageId}`, {
        method: 'DELETE',
      });

      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          body?.message ??
            'Erreur lors de la suppression de la page surveillée. / Error deleting monitored page.',
        );
      }

      // updateListAfterDelete / miseAJourListeApresSuppression
      setPages((prev) => prev.filter((page) => page.id !== pageId));

      // removeChangesState / supprimerEtatChangements : on nettoie le cache de changements pour cette page
      // Clean changes cache for this page
      setChangesByPage((prev) => {
        const clone = { ...prev };
        delete clone[pageId];
        return clone;
      });

      if (expandedPageId === pageId) {
        setExpandedPageId(null);
      }

      setStatusMessage(
        body?.message ??
          'Page surveillée supprimée. / Monitored page deleted.',
      );
    } catch (error) {
      console.error('deletePageError / erreurSuppressionPageSurveillee', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la suppression de la page surveillée. / Error deleting monitored page.',
      );
    } finally {
      setDeletingPageId(null);
    }
  }

  // loadChangesForPage / chargerChangementsPage : récupère l'historique pour une page
  // Load history of changes for a given page
  async function loadChangesForPage(
    pageId: number,
    options?: { forceReload?: boolean },
  ) {
    const current = changesByPage[pageId];

    if (current && current.changes && !options?.forceReload) {
      // alreadyLoaded / dejaCharge : pas besoin de recharger
      // Already loaded: no need to reload
      return;
    }

    setChangesByPage((prev) => ({
      ...prev,
      [pageId]: {
        loading: true,
        error: null,
        changes: current?.changes ?? null,
      },
    }));

    try {
      const response = await fetch(`/api/monitored-pages/${pageId}/changes`);
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | PageChange[]
        | null;

      if (!response.ok || !Array.isArray(body)) {
        throw new Error(
          !Array.isArray(body) && body?.message
            ? body.message
            : 'Erreur lors du chargement des changements. / Error loading changes.',
        );
      }

      setChangesByPage((prev) => ({
        ...prev,
        [pageId]: {
          loading: false,
          error: null,
          changes: body,
        },
      }));
    } catch (error) {
      console.error('loadChangesError / erreurChargementChangements', error);
      setChangesByPage((prev) => ({
        ...prev,
        [pageId]: {
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Erreur lors du chargement des changements. / Error loading changes.',
          changes: prev[pageId]?.changes ?? null,
        },
      }));
    }
  }

  // handleToggleChanges / gererAffichageChangements : ouvrir/fermer l'historique pour une page
  // Toggle history display for a given page
  async function handleToggleChanges(pageId: number) {
    if (expandedPageId === pageId) {
      // collapse / refermer
      setExpandedPageId(null);
      return;
    }

    setExpandedPageId(pageId);
    await loadChangesForPage(pageId);
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      {/* Formulaire de création / creation form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">
          Ajouter une page surveillée
        </h2>

        <form
          onSubmit={handleCreatePage}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="page-url"
              className="text-sm font-medium text-slate-100"
            >
              URL de la page
              <span className="text-red-400"> *</span>
            </label>
            <input
              id="page-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://exemple.com/pricing"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="page-type"
              className="text-sm font-medium text-slate-100"
            >
              Type de page
            </label>
            <select
              id="page-type"
              value={pageType}
              onChange={(event) =>
                setPageType(event.target.value as MonitoredPage['pageType'])
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="PRICING">{PAGE_TYPE_LABELS.PRICING}</option>
              <option value="LANDING">{PAGE_TYPE_LABELS.LANDING}</option>
              <option value="PRODUCT">{PAGE_TYPE_LABELS.PRODUCT}</option>
              <option value="BLOG">{PAGE_TYPE_LABELS.BLOG}</option>
              <option value="OTHER">{PAGE_TYPE_LABELS.OTHER}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="page-note"
              className="text-sm font-medium text-slate-100"
            >
              Note interne (optionnel)
            </label>
            <textarea
              id="page-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex : Page pricing FR, important pour l'offre Pro."
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              Ajouter la page
            </button>
          </div>
        </form>
      </div>

      {/* Liste des pages / pages list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Pages surveillées
            </h2>
            <p className="text-xs text-slate-400">
              {pages.length}{' '}
              {pages.length <= 1 ? 'page' : 'pages'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchPages()}
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            Rafraîchir
          </button>
        </div>

        {statusMessage && (
          <p className="mb-3 text-xs text-slate-300">
            {statusMessage}
          </p>
        )}

        {isLoading && pages.length === 0 ? (
          <p className="text-sm text-slate-300">
            Chargement des pages surveillées... / Loading monitored pages...
          </p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-slate-300">
            Aucune page surveillée pour le moment. Ajoutez une première URL avec
            le formulaire. / No monitored pages yet. Add one using the form.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pages.map((page) => {
              const changesState = changesByPage[page.id];
              const isExpanded = expandedPageId === page.id;

              return (
                <li
                  key={page.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-sky-400 hover:underline break-all"
                      >
                        {page.url}
                      </a>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {PAGE_TYPE_LABELS[page.pageType]}
                      </p>
                      {page.note && (
                        <p className="mt-1 text-xs text-slate-300">
                          {page.note}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleRunSnapshot(page.id)}
                          className="text-[11px] text-sky-400 hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={scrapingPageId === page.id}
                        >
                          {scrapingPageId === page.id
                            ? 'Snapshot en cours... / Snapshot running...'
                            : 'Prendre un snapshot / Run snapshot'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleToggleChanges(page.id)}
                          className="text-[11px] text-slate-300 hover:text-slate-100"
                        >
                          {isExpanded
                            ? 'Masquer les changements / Hide changes'
                            : 'Voir les changements / View changes'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeletePage(page.id)}
                          className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={deletingPageId === page.id}
                        >
                          {deletingPageId === page.id
                            ? 'Suppression... / Deleting...'
                            : 'Supprimer la page / Delete page'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                          {changesState?.loading && !changesState.changes ? (
                            <p className="text-[11px] text-slate-300">
                              Chargement des changements... / Loading changes...
                            </p>
                          ) : changesState?.error ? (
                            <p className="text-[11px] text-red-400">
                              {changesState.error}
                            </p>
                          ) : !changesState?.changes ||
                            changesState.changes.length === 0 ? (
                            <p className="text-[11px] text-slate-300">
                              Aucun changement enregistré pour cette page. / No
                              changes recorded for this page.
                            </p>
                          ) : (
                            <ul className="flex flex-col gap-2">
                              {changesState.changes.map((change) => (
                                <li
                                  key={change.id}
                                  className="rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1"
                                >
                                  <p className="text-[11px] font-medium text-slate-100">
                                    {CHANGE_TYPE_LABELS[change.changeType]}
                                  </p>
                                  {change.changeSummary && (
                                    <p className="mt-0.5 text-[11px] text-slate-300">
                                      {change.changeSummary}
                                    </p>
                                  )}
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    Le{' '}
                                    {new Date(
                                      change.createdAt,
                                    ).toLocaleString('fr-FR', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Créée le{' '}
                      {new Date(page.createdAt).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
