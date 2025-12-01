'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { apiJson } from '@/lib/apiClient';

// ProjectSummary / resumeProjet : représentation côté client d'un projet
// Client-side representation of a project
export type ProjectSummary = {
  id: number;
  name: string;
  description: string | null;
  frequency: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  competitorCount: number;
  createdAt: string | Date;
};

// labelsFrequency / libellesFrequence : affichage lisible des fréquences
// Human-readable labels for frequencies
const FREQUENCY_LABELS: Record<ProjectSummary['frequency'], string> = {
  MANUAL: 'Manuel',
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
};

type ProjectsPageClientProps = {
  projectId?: number; // not used but kept for possible future extension
  initialProjects: ProjectSummary[];
};

export default function ProjectsPageClient({
  initialProjects,
}: ProjectsPageClientProps) {
  // projectsState / etatProjets : liste des projets affichés
  // List of projects displayed
  const [projects, setProjects] =
    useState<ProjectSummary[]>(initialProjects);

  // loadingState / etatChargement : pour le refresh et certaines actions
  // Loading state for refresh and some actions
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // errorState / etatErreur : message d'erreur global
  // Global error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // statusMessage / messageStatut : message informatif (succès, info)
  // Informational message (success, info)
  const [statusMessage, setStatusMessage] = useState<string | null>(
    null,
  );

  // createFormState / etatFormulaireCreation : champs pour créer un projet
  // Form fields for creating a project
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [frequency, setFrequency] =
    useState<ProjectSummary['frequency']>('MANUAL');

  // editState / etatEdition : projet en cours d'édition
  // Edit state: project being edited
  const [editingProjectId, setEditingProjectId] = useState<number | null>(
    null,
  );
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editFrequency, setEditFrequency] =
    useState<ProjectSummary['frequency']>('MANUAL');

  // deletingProjectId / idProjetSuppression : projet en cours de suppression
  // Project being deleted
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(
    null,
  );

  // syncInitial / synchroniserInitial : si les projets initiaux changent (navigation etc.)
  // Sync local state if initial projects change
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // fetchProjects / chargerProjets : recharge la liste depuis l'API
  // Reload projects list from the API
  async function fetchProjects() {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const body = await apiJson<ProjectSummary[]>(
        '/api/projects',
        undefined,
        'Erreur lors du chargement des projets. / Error loading projects.',
      );

      setProjects(body);
    } catch (error) {
      console.error('fetchProjectsError / erreurChargementProjets', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors du chargement des projets. / Error loading projects.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleCreateProject / gererCreationProjet : soumission du formulaire de création
  // Handle creation form submission
  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setErrorMessage(
        'Le nom du projet est obligatoire. / Project name is required.',
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const body = await apiJson<{
        id: number;
        name: string;
        description: string | null;
        frequency: ProjectSummary['frequency'];
        createdAt: string;
      }>(
        '/api/projects',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            description: trimmedDescription || undefined,
            frequency,
          }),
        },
        'Erreur lors de la création du projet. / Error creating project.',
      );

      const createdProject: ProjectSummary = {
        id: body.id,
        name: body.name,
        description: body.description,
        frequency: body.frequency,
        competitorCount: 0,
        createdAt: body.createdAt ?? new Date().toISOString(),
      };

      // addProject / ajouterProjet : on ajoute le projet en tête de liste
      // Add created project at the top of the list
      setProjects((prev) => [createdProject, ...prev]);

      // resetForm / reinitialiserFormulaire : on vide les champs après succès
      // Reset fields on success
      setName('');
      setDescription('');
      setFrequency('MANUAL');

      setStatusMessage(
        'Projet créé avec succès. / Project created successfully.',
      );
    } catch (error) {
      console.error('createProjectError / erreurCreationProjet', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la création du projet. / Error creating project.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleStartEdit / gererDebutEdition : prépare l'édition d'un projet
  // Prepare edit mode for a project
  function handleStartEdit(project: ProjectSummary) {
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? '');
    setEditFrequency(project.frequency);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  // handleCancelEdit / gererAnnulationEdition : annule l'édition en cours
  // Cancel current edit
  function handleCancelEdit() {
    setEditingProjectId(null);
  }

  // handleUpdateProject / gererMiseAJourProjet : soumission du formulaire d'édition
  // Handle edit form submission
  async function handleUpdateProject(
    projectId: number,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();

    if (!trimmedName) {
      setErrorMessage(
        'Le nom du projet ne peut pas être vide. / Project name cannot be empty.',
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const updated = await apiJson<{
        id: number;
        name: string;
        description: string | null;
        frequency: ProjectSummary['frequency'];
        createdAt: string;
      }>(
        `/api/projects/${projectId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            description: trimmedDescription || null,
            frequency: editFrequency,
          }),
        },
        'Erreur lors de la mise à jour du projet. / Error updating project.',
      );

      // updateState / miseAJourEtat : remplacer le projet dans la liste
      // Replace project in the list
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                name: updated.name,
                description: updated.description,
                frequency: updated.frequency,
              }
            : project,
        ),
      );

      setEditingProjectId(null);

      setStatusMessage(
        'Projet mis à jour avec succès. / Project updated successfully.',
      );
    } catch (error) {
      console.error('updateProjectError / erreurMiseAJourProjet', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la mise à jour du projet. / Error updating project.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleDeleteProject / gererSuppressionProjet : supprime un projet et toutes ses données
  // Delete project and all its related data
  async function handleDeleteProject(projectId: number) {
    const confirmDelete = window.confirm(
      'Supprimer ce projet et toutes les données associées (concurrents, pages, snapshots, changements, rapports) ? / Delete this project and all related data (competitors, pages, snapshots, changes, reports)?',
    );
    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingProjectId(projectId);
      setErrorMessage(null);
      setStatusMessage(null);

      const body = await apiJson<{ message?: string }>(
        `/api/projects/${projectId}`,
        {
          method: 'DELETE',
        },
        'Erreur lors de la suppression du projet. / Error deleting project.',
      );

      // suppressionLocale / localDeletion : on retire le projet de la liste
      // remove project locally from the list
      setProjects((prev) => prev.filter((project) => project.id !== projectId));

      // messageSucces / successMessage : on affiche le message retourné ou un fallback
      // show backend success message or a fallback
      setStatusMessage(
        body?.message ??
          'Projet supprimé avec succès. / Project deleted successfully.',
      );
    } catch (error) {
      console.error('deleteProjectError / erreurSuppressionProjet', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la suppression du projet. / Error deleting project.',
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      {/* Formulaire de création / creation form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">
          Créer un projet de veille
        </h2>

        <form
          onSubmit={handleCreateProject}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-name"
              className="text-sm font-medium text-slate-100"
            >
              Nom du projet
              <span className="text-red-400"> *</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Veille pricing SaaS CRM Europe"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-description"
              className="text-sm font-medium text-slate-100"
            >
              Description (optionnel)
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex : Veille des offres et tarifs sur 5 concurrents principaux."
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-frequency"
              className="text-sm font-medium text-slate-100"
            >
              Fréquence cible (indicatif)
            </label>
            <select
              id="project-frequency"
              value={frequency}
              onChange={(event) =>
                setFrequency(
                  event.target.value as ProjectSummary['frequency'],
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="MANUAL">
                {FREQUENCY_LABELS.MANUAL} (MVP)
              </option>
              <option value="DAILY">{FREQUENCY_LABELS.DAILY}</option>
              <option value="WEEKLY">{FREQUENCY_LABELS.WEEKLY}</option>
              <option value="MONTHLY">{FREQUENCY_LABELS.MONTHLY}</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Sélection utilisée plus tard pour automatiser les runs. / Used
              later to automate runs.
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
              Créer le projet
            </button>
          </div>
        </form>
      </div>

      {/* Liste des projets / projects list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Projets de veille
            </h2>
            <p className="text-xs text-slate-400">
              {projects.length}{' '}
              {projects.length <= 1 ? 'projet' : 'projets'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchProjects()}
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

        {isLoading && projects.length === 0 ? (
          <p className="text-sm text-slate-300">
            Chargement des projets... / Loading projects...
          </p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-300">
            Aucun projet pour le moment. Créez un premier projet avec le
            formulaire. / No project yet. Create one using the form.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {projects.map((project) => {
              const isEditing = editingProjectId === project.id;

              return (
                <li
                  key={project.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {project.name}
                        </Link>
                        {project.description && !isEditing && (
                          <p className="mt-1 text-xs text-slate-300">
                            {project.description}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">
                          Fréquence :{' '}
                          <span className="font-medium">
                            {FREQUENCY_LABELS[project.frequency]}
                          </span>{' '}
                          · {project.competitorCount}{' '}
                          {project.competitorCount <= 1
                            ? 'concurrent'
                            : 'concurrents'}
                        </p>
                      </div>

                      {/* projectMetaActions / actionsMetaProjet :
                          infos de création + accès changements & rapports */}
                      {/* Creation info + quick access to changes & reports */}
                      <div className="text-right text-[11px] text-slate-500">
                        <p>
                          Créé le{' '}
                          {new Date(project.createdAt).toLocaleString(
                            'fr-FR',
                            {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            },
                          )}
                        </p>
                        <Link
                          href={`/projects/${project.id}/changes`}
                          className="mt-1 inline-block text-[11px] text-sky-400 hover:text-sky-300"
                        >
                          Voir les changements récents
                        </Link>
                        <Link
                          href={`/projects/${project.id}/reports`}
                          className="mt-0.5 inline-block text-[11px] text-emerald-400 hover:text-emerald-300"
                        >
                          Voir les rapports de veille
                        </Link>
                      </div>
                    </div>

                    {isEditing ? (
                      <form
                        onSubmit={(event) =>
                          void handleUpdateProject(project.id, event)
                        }
                        className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 flex flex-col gap-2"
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Nom du projet / Project name
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
                            Description (optionnel)
                          </label>
                          <textarea
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.target.value)
                            }
                            rows={2}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-slate-200">
                            Fréquence cible
                          </label>
                          <select
                            value={editFrequency}
                            onChange={(event) =>
                              setEditFrequency(
                                event.target
                                  .value as ProjectSummary['frequency'],
                              )
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="MANUAL">
                              {FREQUENCY_LABELS.MANUAL}
                            </option>
                            <option value="DAILY">
                              {FREQUENCY_LABELS.DAILY}
                            </option>
                            <option value="WEEKLY">
                              {FREQUENCY_LABELS.WEEKLY}
                            </option>
                            <option value="MONTHLY">
                              {FREQUENCY_LABELS.MONTHLY}
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
                            disabled={isLoading}
                          >
                            Enregistrer / Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(project)}
                          className="text-[11px] text-slate-300 hover:text-slate-100"
                        >
                          Modifier le projet / Edit project
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteProject(project.id)}
                          className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={deletingProjectId === project.id}
                        >
                          {deletingProjectId === project.id
                            ? 'Suppression... / Deleting...'
                            : 'Supprimer le projet / Delete project'}
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
