'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { apiJson } from '@/lib/apiClient';

// CompetitorStatusType / typeStatutConcurrent : statut fonctionnel du concurrent
// Functional status of the competitor
export type CompetitorStatusType = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

// CompetitorType / typeConcurrent : représentation côté client d'un concurrent
// Client-side representation of a competitor
export type Competitor = {
  id: number;
  projectId: number;
  name: string;
  websiteUrl: string | null;
  description: string | null;
  tags: string | null;
  status: CompetitorStatusType;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProjectCompetitorsPanelProps = {
  projectId: number;
  initialCompetitors: Competitor[];
};

// statusLabels / libellesStatut : affichage lisible des statuts
// Human-readable labels for statuses
const STATUS_LABELS: Record<CompetitorStatusType, string> = {
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  ARCHIVED: 'Archivé',
};

// statusBadgeClasses / classesBadgesStatut : classes Tailwind pour le badge
// Tailwind classes for status badges
const STATUS_BADGE_CLASSES: Record<CompetitorStatusType, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  PAUSED: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  ARCHIVED: 'bg-slate-600/20 text-slate-300 border-slate-500/40',
};

export default function ProjectCompetitorsPanel({
  projectId,
  initialCompetitors,
}: ProjectCompetitorsPanelProps) {
  // competitorsState / etatConcurrents : liste des concurrents affichés
  // List of competitors currently displayed
  const [competitors, setCompetitors] = useState<Competitor[]>(
    initialCompetitors,
  );

  // loadingState / etatChargement : chargement lors d'un refresh ou création
  // Loading state for refresh or creation
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // errorState / etatErreur : message d'erreur pour la section concurrents
  // Error message for the competitors section
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // statusMessage / messageStatut : message d'information (succès, etc.)
  // Informational message (success, etc.)
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // formState / etatFormulaire : champs pour la création d'un concurrent
  // Form fields for creating a competitor
  const [name, setName] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string>('');

  // editState / etatEdition : concurrent en cours d'édition
  // Edit state: competitor being edited
  const [editingCompetitorId, setEditingCompetitorId] = useState<number | null>(
    null,
  );
  const [editName, setEditName] = useState<string>('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [editStatus, setEditStatus] =
    useState<CompetitorStatusType>('ACTIVE');

  // updatingCompetitorId / idConcurrentMiseAJour : concurrent en cours de patch
  // Competitor currently being updated
  const [updatingCompetitorId, setUpdatingCompetitorId] = useState<
    number | null
  >(null);

  // deletingCompetitorId / idConcurrentSuppression : concurrent en cours de suppression
  // Competitor currently being deleted
  const [deletingCompetitorId, setDeletingCompetitorId] = useState<
    number | null
  >(null);

  // small helper / petitHelper : reset des messages d'état
  // Reset error & status messages
  function resetMessages() {
    setErrorMessage(null);
    setStatusMessage(null);
  }

  // syncInitialData / synchroniserDonneesInitiales :
  // si le projet change ou initialCompetitors change, on resynchronise
  // Resync state if project or initialCompetitors change
  useEffect(() => {
    setCompetitors(initialCompetitors);
  }, [initialCompetitors]);

  // fetchCompetitors / chargerConcurrents : recharge la liste depuis l'API
  // Reload the competitors list from the API
  async function fetchCompetitors() {
    try {
      setIsLoading(true);
      resetMessages();

      const body = await apiJson<unknown>(
        `/api/projects/${projectId}/competitors`,
        undefined,
        'Erreur lors du chargement des concurrents. / Error loading competitors.',
      );

      if (!Array.isArray(body)) {
        throw new Error(
          'Réponse inattendue du serveur (concurrents). / Unexpected server response (competitors).',
        );
      }

      setCompetitors(body as Competitor[]);
    } catch (error) {
      console.error(
        'fetchCompetitorsError / erreurChargementConcurrents',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les concurrents. / Unable to load competitors.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleCreateCompetitor / gererCreationConcurrent : soumission du formulaire
  // Handle form submission to create a competitor
  async function handleCreateCompetitor(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedWebsiteUrl = websiteUrl.trim();
    const trimmedDescription = description.trim();
    const trimmedTags = tags.trim();

    if (!trimmedName) {
      setErrorMessage(
        'Le nom du concurrent est obligatoire. / Competitor name is required.',
      );
      return;
    }

    try {
      setIsLoading(true);
      resetMessages();

      const createdCompetitor = await apiJson<Competitor>(
        `/api/projects/${projectId}/competitors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            websiteUrl: trimmedWebsiteUrl || undefined,
            description: trimmedDescription || undefined,
            tags: trimmedTags || undefined,
          }),
        },
        'Erreur lors de la création du concurrent. / Error creating competitor.',
      );

      // updateList / miseAJourListe : on ajoute le concurrent créé en tête
      // Add the created competitor at the top of the list
      setCompetitors((prev) => [createdCompetitor, ...prev]);

      // resetForm / reinitialiserFormulaire : on vide les champs après succès
      // Reset form fields on success
      setName('');
      setWebsiteUrl('');
      setDescription('');
      setTags('');

      setStatusMessage(
        'Concurrent créé avec succès. / Competitor created successfully.',
      );
    } catch (error) {
      console.error(
        'createCompetitorError / erreurCreationConcurrent',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la création du concurrent. / Error creating competitor.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleStartEdit / gererDebutEdition : prépare l'édition d'un concurrent
  // Prepare edit mode for a competitor
  function handleStartEdit(competitor: Competitor) {
    setEditingCompetitorId(competitor.id);
    setEditName(competitor.name);
    setEditWebsiteUrl(competitor.websiteUrl ?? '');
    setEditDescription(competitor.description ?? '');
    setEditTags(competitor.tags ?? '');
    setEditStatus(competitor.status ?? 'ACTIVE');
    resetMessages();
  }

  // handleCancelEdit / gererAnnulationEdition : annule l'édition
  // Cancel edit mode
  function handleCancelEdit() {
    setEditingCompetitorId(null);
  }

  // handleUpdateCompetitor / gererMiseAJourConcurrent : soumission du formulaire d'édition
  // Handle edit form submission
  async function handleUpdateCompetitor(
    competitorId: number,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = editName.trim();
    const trimmedWebsiteUrl = editWebsiteUrl.trim();
    const trimmedDescription = editDescription.trim();
    const trimmedTags = editTags.trim();

    if (!trimmedName) {
      setErrorMessage(
        'Le nom du concurrent ne peut pas être vide. / Competitor name cannot be empty.',
      );
      return;
    }

    try {
      setUpdatingCompetitorId(competitorId);
      resetMessages();

      const updated = await apiJson<Competitor>(
        `/api/competitors/${competitorId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            websiteUrl: trimmedWebsiteUrl || null,
            description: trimmedDescription || null,
            tags: trimmedTags || null,
            status: editStatus,
          }),
        },
        'Erreur lors de la mise à jour du concurrent. / Error updating competitor.',
      );

      // updateState / miseAJourEtat : remplacer le concurrent dans la liste
      // Replace competitor in the list
      setCompetitors((prev) =>
        prev.map((competitor) =>
          competitor.id === competitorId
            ? { ...competitor, ...updated }
            : competitor,
        ),
      );

      setEditingCompetitorId(null);
      setStatusMessage(
        'Concurrent mis à jour avec succès. / Competitor updated successfully.',
      );
    } catch (error) {
      console.error(
        'updateCompetitorError / erreurMiseAJourConcurrent',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la mise à jour du concurrent. / Error updating competitor.',
      );
    } finally {
      setUpdatingCompetitorId(null);
    }
  }

  // handleQuickStatusChange / gererChangementRapideStatut : change seulement le statut
  // Quick status change handler: only updates status
  async function handleQuickStatusChange(
    competitorId: number,
    newStatus: CompetitorStatusType,
  ) {
    try {
      setUpdatingCompetitorId(competitorId);
      resetMessages();

      const updated = await apiJson<Competitor>(
        `/api/competitors/${competitorId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        },
        'Erreur lors de la mise à jour du statut. / Error updating status.',
      );

      setCompetitors((prev) =>
        prev.map((competitor) =>
          competitor.id === competitorId
            ? { ...competitor, status: updated.status }
            : competitor,
        ),
      );

      setStatusMessage(
        'Statut du concurrent mis à jour. / Competitor status updated.',
      );
    } catch (error) {
      console.error(
        'updateStatusError / erreurMiseAJourStatutConcurrent',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la mise à jour du statut du concurrent. / Error updating competitor status.',
      );
    } finally {
      setUpdatingCompetitorId(null);
    }
  }

  // handleDeleteCompetitor / gererSuppressionConcurrent : supprime un concurrent
  // Delete a competitor and cascade delete related data
  async function handleDeleteCompetitor(competitorId: number) {
    const confirmDelete = window.confirm(
      'Supprimer ce concurrent et toutes ses pages surveillées, snapshots et changements associés ? / Delete this competitor and all its monitored pages, snapshots and changes?',
    );
    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingCompetitorId(competitorId);
      resetMessages();

      const body = await apiJson<{ message?: string }>(
        `/api/competitors/${competitorId}`,
        {
          method: 'DELETE',
        },
        'Erreur lors de la suppression du concurrent. / Error deleting competitor.',
      );

      setCompetitors((prev) =>
        prev.filter((competitor) => competitor.id !== competitorId),
      );

      setStatusMessage(
        body?.message ??
          'Concurrent supprimé avec succès. / Competitor deleted successfully.',
      );
    } catch (error) {
      console.error(
        'deleteCompetitorError / erreurSuppressionConcurrent',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la suppression du concurrent. / Error deleting competitor.',
      );
    } finally {
      setDeletingCompetitorId(null);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      {/* Formulaire de création / creation form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">
          Ajouter un concurrent
        </h2>

        <form
          onSubmit={handleCreateCompetitor}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="competitor-name"
              className="text-sm font-medium text-slate-100"
            >
              Nom du concurrent
              <span className="text-red-400"> *</span>
            </label>
            <input
              id="competitor-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Acme Analytics"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="competitor-website"
              className="text-sm font-medium text-slate-100"
            >
              Site web (optionnel)
            </label>
            <input
              id="competitor-website"
              type="url"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://www.exemple.com"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="competitor-description"
              className="text-sm font-medium text-slate-100"
            >
              Description (optionnel)
            </label>
            <textarea
              id="competitor-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Positionnement, segment, type d'offre..."
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="competitor-tags"
              className="text-sm font-medium text-slate-100"
            >
              Tags (optionnel)
            </label>
            <input
              id="competitor-tags"
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Ex : SaaS, Analytics, PME"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400">
              Séparez les tags par des virgules. / Separate tags with
              commas.
            </p>
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
              Ajouter le concurrent
            </button>
          </div>
        </form>
      </div>

      {/* Liste des concurrents / competitors list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Concurrents du projet
            </h2>
            <p className="text-xs text-slate-400">
              {competitors.length}{' '}
              {competitors.length <= 1
                ? 'concurrent'
                : 'concurrents'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchCompetitors()}
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

        {isLoading && competitors.length === 0 ? (
          <p className="text-sm text-slate-300">
            Chargement des concurrents... / Loading competitors...
          </p>
        ) : competitors.length === 0 ? (
          <p className="text-sm text-slate-300">
            Aucun concurrent pour le moment. Ajoutez un premier
            concurrent avec le formulaire. / No competitors yet. Add
            one using the form.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {competitors.map((competitor) => {
              const isEditing =
                editingCompetitorId === competitor.id;
              const isBusy =
                updatingCompetitorId === competitor.id ||
                deletingCompetitorId === competitor.id;

              return (
                <li
                  key={competitor.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {competitor.name}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-medium ${
                              STATUS_BADGE_CLASSES[
                                competitor.status
                              ]
                            }`}
                          >
                            {STATUS_LABELS[competitor.status]}
                          </span>
                        </div>

                        {competitor.description && !isEditing && (
                          <p className="mt-1 text-xs text-slate-300">
                            {competitor.description}
                          </p>
                        )}
                        {competitor.websiteUrl && !isEditing && (
                          <p className="mt-1 text-xs">
                            <a
                              href={competitor.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:underline"
                            >
                              {competitor.websiteUrl}
                            </a>
                          </p>
                        )}
                        {competitor.tags && !isEditing && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Tags : {competitor.tags}
                          </p>
                        )}

                        <div className="mt-1">
                          <Link
                            href={`/competitors/${competitor.id}`}
                            className="text-[11px] text-sky-400 hover:text-sky-300"
                          >
                            Gérer les pages / Manage pages
                          </Link>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-500">
                        <p>
                          Ajouté le{' '}
                          {new Date(
                            competitor.createdAt,
                          ).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Zone d'édition / edit zone */}
                    {isEditing ? (
                      <form
                        onSubmit={(event) =>
                          void handleUpdateCompetitor(
                            competitor.id,
                            event,
                          )
                        }
                        className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Nom du concurrent / Competitor name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(event) =>
                              setEditName(event.target.value)
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Site web (optionnel)
                          </label>
                          <input
                            type="url"
                            value={editWebsiteUrl}
                            onChange={(event) =>
                              setEditWebsiteUrl(
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Description (optionnel)
                          </label>
                          <textarea
                            rows={2}
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Tags (optionnel)
                          </label>
                          <input
                            type="text"
                            value={editTags}
                            onChange={(event) =>
                              setEditTags(event.target.value)
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Statut / Status
                          </label>
                          <select
                            value={editStatus}
                            onChange={(event) =>
                              setEditStatus(
                                event.target
                                  .value as CompetitorStatusType,
                              )
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="ACTIVE">
                              {STATUS_LABELS.ACTIVE}
                            </option>
                            <option value="PAUSED">
                              {STATUS_LABELS.PAUSED}
                            </option>
                            <option value="ARCHIVED">
                              {STATUS_LABELS.ARCHIVED}
                            </option>
                          </select>
                        </div>

                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            Annuler / Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded-md border border-sky-500/70 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={isBusy}
                          >
                            Enregistrer / Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span>Statut :</span>
                          <select
                            value={competitor.status}
                            onChange={(event) =>
                              void handleQuickStatusChange(
                                competitor.id,
                                event.target
                                  .value as CompetitorStatusType,
                              )
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            disabled={isBusy}
                          >
                            <option value="ACTIVE">
                              {STATUS_LABELS.ACTIVE}
                            </option>
                            <option value="PAUSED">
                              {STATUS_LABELS.PAUSED}
                            </option>
                            <option value="ARCHIVED">
                              {STATUS_LABELS.ARCHIVED}
                            </option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(competitor)}
                          className="text-[11px] text-slate-300 hover:text-slate-100"
                          disabled={isBusy}
                        >
                          Modifier / Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteCompetitor(
                              competitor.id,
                            )
                          }
                          className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isBusy}
                        >
                          {deletingCompetitorId === competitor.id
                            ? 'Suppression... / Deleting...'
                            : 'Supprimer / Delete'}
                        </button>
                      </div>
                    )}
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
