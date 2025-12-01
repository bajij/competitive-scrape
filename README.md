# Competitive Watch/scrape – MVP

Outil de **veille concurrentielle** pour suivre les changements sur les pages web de concurrents (contenu, tarifs…) et générer des **rapports de synthèse** (avec IA ou sans).

Ce dépôt contient un MVP en Next.js basé sur :

- Suivi de projets de veille
- Gestion de concurrents et de leurs pages surveillées
- Snapshots + détection de changements
- Historique de changements
- Rapports de veille synthétiques générés avec l’API OpenAI

---

## 1. Stack & choix d’architecture

### Stack technique

- **Next.js 16 (App Router, Turbopack)**
- **React 18** – Server & Client Components
- **TypeScript**
- **Prisma** + **PostgreSQL**
- **OpenAI API** (via un petit client dans `lib/openaiClient.ts`)
- **Tailwind-like CSS** (classes utilitaires dans les JSX)

### Principes d’architecture

- **Server Components** pour :
  - Récupération des données (Prisma) dans les pages `/app/.../page.tsx`
  - Préparation de props typés pour les composants client

- **Client Components** pour :
  - Formulaires (création / édition / suppression)
  - Appels `fetch` vers les routes API (`app/api/...`)
  - États UI (loading, erreurs, messages de statut…)

- **Routes API Next.js** (`app/api/...`) comme fine couche REST :
  - Validation d’input basique
  - Appels Prisma
  - Gestion des erreurs + messages bi-lingues (FR/EN)

- **Prisma** comme “source of truth” :
  - Modèle relationnel structuré pour projets, concurrents, pages, snapshots, changements, rapports
  - Relations `onDelete: Cascade` pour ne pas laisser de données orphelines

- **Séparation nette des responsabilités** :
  - **Scraping / snapshots** : `lib/scraping.ts` + `app/api/monitored-pages/[pageId]/scrape/route.ts`
  - **Détection de changements** : même route, en comparant “snapshot courant vs précédent”
  - **Synthèse IA** : `app/api/projects/[projectId]/reports/route.ts` + `lib/openaiClient.ts`

---

## 2. Modèle de données (Prisma)

Fichier : `prisma/schema.prisma`

### Enums principales

- `Frequency` : `MANUAL | DAILY | WEEKLY | MONTHLY`  
- `PageType` : `PRICING | LANDING | PRODUCT | BLOG | OTHER`
- `ChangeType` : `TEXT | PRICE | SECTION_ADDED | SECTION_REMOVED | OTHER`
- `CompetitorStatus` : `ACTIVE | PAUSED | ARCHIVED`

### Modèles

- **Project**
  - `id`, `name`, `description?`, `frequency`
  - Relations : `competitors`, `reports`
  - Index sur `frequency`

- **Competitor**
  - `id`, `projectId`, `status`, `name`, `websiteUrl?`, `description?`, `tags?`
  - Relation : `project` (delete en cascade), `monitoredPages`
  - Statut fonctionnel pour activer / mettre en pause / archiver un concurrent

- **MonitoredPage**
  - `id`, `competitorId`, `url`, `pageType`, `note?`
  - Relations : `snapshots`, `changes`
  - Sert d’unité de scraping

- **Snapshot**
  - `id`, `monitoredPageId`, `capturedAt`
  - `rawHtml?`, `extractedText?`, `extractedPricing? (JSON)`
  - Relations inverses vers `Change` : `changesAsOld`, `changesAsNew`

- **Change**
  - `id`, `monitoredPageId`
  - `oldSnapshotId?`, `newSnapshotId?`
  - `changeType`, `field?`, `oldValue?`, `newValue?`, `changeSummary?`
  - Index sur `monitoredPageId`, `changeType`, `createdAt`

- **Report**
  - `id`, `projectId`
  - `periodStart?`, `periodEnd?`, `generatedAt`
  - `aiSummary? (TEXT)` – résume la période
  - `highlights? (JSON)` – faits marquants structurés (titres, détails, concurrent, impact)
  - `pdfUrl?` (réservé pour plus tard)

---

## 3. Structure des dossiers & responsabilités

### Pages principales (`app/`)

- `app/projects/page.tsx`  
  Page serveur qui :
  - Récupère les projets via Prisma (`project.findMany` + `_count.competitors`)
  - Passe la liste à `ProjectsPageClient`

- `app/projects/ProjectsPageClient.tsx`  
  Composant client qui gère :
  - Liste des projets en state
  - Création de projet (`POST /api/projects`)
  - Mise à jour (`PATCH /api/projects/[projectId]`)
  - Suppression (`DELETE /api/projects/[projectId]`)
  - Navigation vers :
    - Détail projet `/projects/[projectId]`
    - Rapports `/projects/[projectId]/reports`
    - Historique des changements `/projects/[projectId]/changes`

---

- `app/projects/[projectId]/page.tsx`  
  Page serveur de **détail projet** :
  - Charge le projet (nom, description, fréquence)
  - Charge les concurrents associés (et leurs pages surveillées si besoin)
  - Affiche différentes sections :
    - Panel concurrents (`ProjectCompetitorsPanel`)
    - Peut inclure un résumé rapide de l’activité & liens :
      - “Voir les changements récents”
      - “Voir les rapports de veille”

- `app/projects/[projectId]/ProjectCompetitorsPanel.tsx`  
  Composant client responsable de :
  - **CRUD concurrents** pour un projet :
    - Création (`POST /api/projects/[projectId]/competitors`)
    - Mise à jour (`PATCH /api/competitors/[competitorId]`)
    - Suppression (`DELETE /api/competitors/[competitorId]`)  
      → suppression en cascade des pages surveillées, snapshots et changements
  - Gestion du **statut** (`ACTIVE | PAUSED | ARCHIVED`) via un menu déroulant
  - Liens vers `/competitors/[competitorId]` (“Gérer les pages”)

---

- `app/competitors/[competitorId]/page.tsx`  
  Page de **détail d’un concurrent** :
  - Charge le concurrent et ses `MonitoredPage`
  - Permet :
    - D’ajouter des pages surveillées (URL + type + note)
    - De lancer un snapshot sur une page (bouton → API `/api/monitored-pages/[pageId]/scrape`)
    - De voir les derniers changements pour ce concurrent

- `app/projects/[projectId]/changes/page.tsx`  
  Page de **historique des changements** :
  - Liste des `Change` associés au projet, triés par date
  - Affiche :
    - titre court (Changement de texte, Changement de prix, etc.)
    - résumé (`changeSummary`)
    - infos : concurrent, type de page, URL
    - un diff simple “Avant / Après” (textes tronqués à ~600 chars)

- `app/projects/[projectId]/reports/page.tsx`  
  Page serveur pour les **rapports de veille** :
  - Vérifie que le projet existe
  - Charge les rapports (`Report`) triés par `generatedAt DESC`
  - Transforme le JSON `highlights` en forme adaptée pour le client
  - Passe tout à `ProjectReportsPageClient`

- `app/projects/[projectId]/reports/ProjectReportsPageClient.tsx`  
  Composant client qui :
  - Affiche le formulaire de génération :
    - période facultative (`periodStart`, `periodEnd`)
    - si vide → période par défaut = 7 derniers jours
  - Envoie :
    - `POST /api/projects/[projectId]/reports` pour créer un rapport (avec IA si `OPENAI_API_KEY` présent)
    - `GET /api/projects/[projectId]/reports` pour rafraîchir la liste
  - Affiche :
    - Résumé IA global
    - Faits marquants (titre, détail, concurrent, type de changement, impact)
    - Infos de période et date de génération

- `app/test-scrape/page.tsx`  
  Page **fictive** locale servant à :
  - Simuler des versions 1 / 2 / 3 d’une page de pricing / produits
  - Tester la détection de changements de texte et de prix, ainsi que les rapports IA

---

### Routes API (`app/api/...`)

#### Projets

- `app/api/projects/route.ts`
  - `GET /api/projects` : liste les projets + nombre de concurrents
  - `POST /api/projects` : crée un nouveau projet (validation du nom et de la fréquence)

- `app/api/projects/[projectId]/route.ts`
  - `PATCH /api/projects/[projectId]` : met à jour `name`, `description`, `frequency`
  - `DELETE /api/projects/[projectId]` : supprime le projet **et toutes les données associées** (grâce aux `onDelete: Cascade` de Prisma)

#### Concurrents

- `app/api/projects/[projectId]/competitors/route.ts`
  - `GET /api/projects/[projectId]/competitors` : liste des concurrents du projet
  - `POST /api/projects/[projectId]/competitors` : crée un concurrent pour ce projet

- `app/api/competitors/[competitorId]/route.ts`
  - `PATCH /api/competitors/[competitorId]` : met à jour nom, URL, description, tags, statut
  - `DELETE /api/competitors/[competitorId]` : supprime le concurrent + toutes ses pages / snapshots / changements

#### Pages surveillées & snapshots

- `app/api/monitored-pages/[pageId]/route.ts`
  - (Selon implémentation) supporte la mise à jour / suppression de la page surveillée

- `app/api/monitored-pages/[pageId]/scrape/route.ts`
  - `POST /api/monitored-pages/[pageId]/scrape`
  - Étapes :
    1. Vérifie que la `MonitoredPage` existe
    2. Récupère le **dernier snapshot** pour cette page
    3. Appelle `scrapePage(url)` (dans `lib/scraping.ts`) pour :
       - télécharger le HTML
       - nettoyer (`extractedText`)
       - éventuellement extraire une structure simple de pricing (`extractedPricing`)
    4. Crée un **nouveau `Snapshot`**
    5. Compare avec le snapshot précédent :
       - si changement significatif (texte ou prix) :
         - crée un `Change` (`changeType = TEXT` ou `PRICE`, etc.)
         - renseigne `oldValue`, `newValue`, `changeSummary`
    6. Retourne `snapshot`, `change` et un booléen `hasChange`

- `app/api/monitored-pages/[pageId]/changes/route.ts`
  - `GET /api/monitored-pages/[pageId]/changes` : liste des changements pour une page donnée

#### Rapports de veille + IA

- `app/api/projects/[projectId]/reports/route.ts`
  - `GET /api/projects/[projectId]/reports` :
    - renvoie les rapports de ce projet
  - `POST /api/projects/[projectId]/reports` :
    - parse la période (dates fournies ou 7 derniers jours par défaut)
    - récupère les `Change` du projet sur cette période
    - **optionnel** : appelle `generateAiReport(...)` si `OPENAI_API_KEY` est défini
      - construit un prompt textuel à partir des changements
      - appelle OpenAI (`gpt-4.1-mini`, mode JSON)
      - récupère :
        - `summary` (texte)
        - `highlights` (liste d’objets structurés)
    - crée un `Report` en base avec :
      - `projectId`, `periodStart`, `periodEnd`, `generatedAt`
      - `aiSummary`
      - `highlights` (stockés en JSON)
    - renvoie le rapport créé

---

### Utilitaires (`lib/`)

- `lib/db.ts`
  - Expose un singleton Prisma (`export const prisma = new PrismaClient()`)
  - Évite les problèmes de multiples instances en dev

- `lib/scraping.ts`
  - `scrapePage(url)` :
    - `fetch` serveur sans cache
    - retourne `rawHtml` + `extractedText` (HTML nettoyé)  
    - **Évolution récente** : extraction de blocs de prix / produits (structure JSON simple utilisée pour `extractedPricing` des `Snapshot`)

- `lib/openaiClient.ts`
  - Initialise le client OpenAI avec `process.env.OPENAI_API_KEY`
  - Permet d’appeler `openai.chat.completions.create` depuis l’API des rapports

---

## 4. Workflow fonctionnel

### 4.1. Pour un utilisateur

1. **Créer un projet**
   - Aller sur `/projects`
   - Créer un projet (nom + description + fréquence “MANUAL” par défaut)

2. **Ajouter des concurrents**
   - Depuis la ligne du projet → bouton “Voir / Gérer”
   - Dans la section “Concurrents du projet” :
     - Ajouter un concurrent (nom + site + description + tags)
     - Ajuster son statut (Actif / En pause / Archivé) au besoin

3. **Définir les pages à surveiller**
   - Cliquer sur “Gérer les pages” sur un concurrent → `/competitors/[competitorId]`
   - Ajouter des “Monitored pages” :
     - URL
     - Type de page (`PRICING`, `PRODUCT`, etc.)
     - Note interne

4. **Lancer les snapshots**
   - Sur chaque page surveillée :
     - Bouton “Scraper / Snapshot”
     - L’API crée un nouveau `Snapshot` et détecte les `Change` significatifs

5. **Consulter les changements**
   - Vue globale : `/projects/[projectId]/changes`
     - Liste des derniers changements
     - Détails “Avant / Après” du contenu détecté

6. **Générer un rapport de veille**
   - Page : `/projects/[projectId]/reports`
   - Optionnel : choisir une période (sinon → 7 derniers jours)
   - Bouton “Générer le rapport”
   - L’IA (si disponible) :
     - résume les mouvements clés
     - produit une liste structurée de faits marquants (prix, contenu, nouveaux plans, etc.)

---

## 5. Mise en place locale

### Prérequis

- Node.js (version LTS recommandée)
- pnpm (ou npm/yarn, mais le projet utilise pnpm)
- PostgreSQL accessible (local ou distant)

### 5.1. Variables d’environnement

Créer un fichier `.env` à la racine :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/competitive_watch"
OPENAI_API_KEY="sk-xxxxx"   # Optionnel, mais nécessaire pour les rapports IA

lancer la base 
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init

lancer le projet
pnpm dev




6. Limitations actuelles & pistes d’évolution

Pas d’authentification pour l’instant (MVP mono-user / usage interne).

Pas de planification automatique des scrapes :

tout se fait manuellement via bouton.

évolution naturelle : ajouter un scheduler (CRON, queue, etc.)

Diff textuel simplifié :

on stocke un extrait tronqué (oldValue, newValue)

mais pas encore de diff “visuel” par phrase / paragraphe.

Scraping ciblé mais encore générique :

logique dédiée “prix / produits” sur certains sélecteurs CSS

à spécialiser par type de site ou par concurrent si besoin.

Prochaines étapes possibles :

Détection dédiée de headline / slogan (titre principal de page).

UI pour filtrer les changements par concurrent, type de page, type de changement.

Génération automatique d’un PDF de rapport à partir des Report (colonne pdfUrl déjà prévue).

Mise en place d’un système d’authentification simple (NextAuth, etc.) pour multi-utilisateurs.
