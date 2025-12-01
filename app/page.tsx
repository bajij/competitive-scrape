// homePage / pageAccueil : point d'entrée simple vers la page des projets
// Simple entry point to navigate to the projects page

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="max-w-xl w-full px-6 py-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <h1 className="text-2xl font-semibold mb-4">
          Outil de veille concurrents
        </h1>
        <p className="text-sm text-slate-300 mb-6">
          {/* introText / texteIntro : description courte de l'application */}
          {/* Short intro text describing the application */}
          Cette application vous permet de créer des projets de veille, d&apos;ajouter
          des concurrents et de suivre les changements sur leurs pages clés.
        </p>

        <div className="flex justify-end">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium hover:bg-sky-500/20 transition-colors"
          >
            Accéder aux projets
          </Link>
        </div>
      </div>
    </main>
  );
}
