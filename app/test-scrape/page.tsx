export default function TestScrapePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="max-w-2xl px-6 py-8 rounded-2xl border border-emerald-700 bg-slate-900/70 shadow-lg">
        <h1 className="text-xl font-semibold mb-4">
          Page de test scraping – Version 2 (mise à jour)
        </h1>

        <p className="text-sm text-slate-200 mb-3">
          {/* paragraphOne / premierParagraphe : contenu MODIFIÉ pour cette version */}
          Ceci est la <strong>version 2</strong> de la page de test. Le texte a
          été ajusté pour simuler une mise à jour réelle du site ShopTech&nbsp;:
          certains prix ont changé, un produit supplémentaire a été ajouté et
          les informations affichées doivent permettre à la logique de scraping
          de détecter clairement ces différences par rapport à la version
          précédente.
        </p>

        <div className="mt-4 space-y-2 text-sm text-slate-200">
          <p>
            <span className="font-semibold">Boutique :</span> ShopTech
          </p>
          <p>
            <span className="font-semibold">Dernière mise à jour :</span>{" "}
            <time dateTime="2025-11-15">15 novembre 2025</time>
          </p>
        </div>

        {/* Même section, mêmes IDs/classes, mais contenu modifié */}
        <section
          id="featured-products"
          className="mt-6 space-y-4 text-sm text-slate-100"
        >
          <h2 className="text-lg font-semibold mb-2">
            Produits en vedette (Version 2)
          </h2>

          <article
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
            data-sku="ST-HEAD-X100"
          >
            <h3 className="text-base font-semibold product-name">
              Casque audio sans fil X100 Édition Plus
            </h3>
            <p className="text-xs text-slate-300 product-description">
              Casque Bluetooth avec réduction de bruit active, autonomie de 22h
              et nouveau mode basse latence.
            </p>
            {/* Prix augmenté */}
            <p
              className="mt-2 text-sm font-semibold product-price"
              data-price="84.90"
            >
              84,90 €
            </p>
            <p className="text-xs text-emerald-300 product-availability">
              En stock
            </p>
          </article>

          <article
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
            data-sku="ST-KEYB-K7"
          >
            <h3 className="text-base font-semibold product-name">
              Clavier mécanique Pro K7
            </h3>
            <p className="text-xs text-slate-300 product-description">
              Clavier mécanique RGB avec switches rouges silencieux et nouveau
              repose-poignet magnétique.
            </p>
            {/* Prix identique mais texte différent (livraison) */}
            <p
              className="mt-2 text-sm font-semibold product-price"
              data-price="119.00"
            >
              119,00 €
            </p>
            <p className="text-xs text-emerald-300 product-availability">
              En stock – Livraison 24h
            </p>
          </article>

          <article
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
            data-sku="ST-MOUSE-UL"
          >
            <h3 className="text-base font-semibold product-name">
              Souris gaming UltraLight
            </h3>
            <p className="text-xs text-slate-300 product-description">
              Souris ultra-légère 58g avec capteur 26 000 DPI et câble
              paracord.
            </p>
            {/* Prix en baisse */}
            <p
              className="mt-2 text-sm font-semibold product-price"
              data-price="54.90"
            >
              54,90 €
            </p>
            <p className="text-xs text-emerald-300 product-availability">
              En promotion
            </p>
          </article>

          {/* NOUVEAU PRODUIT ajouté uniquement dans la version 2 */}
          <article
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
            data-sku="ST-SPEAK-BT"
          >
            <h3 className="text-base font-semibold product-name">
              Enceinte Bluetooth BassBoost S1
            </h3>
            <p className="text-xs text-slate-300 product-description">
              Enceinte portable étanche IPX7 avec 12h d&apos;autonomie et
              basses renforcées.
            </p>
            <p
              className="mt-2 text-sm font-semibold product-price"
              data-price="89.90"
            >
              89,90 €
            </p>
            <p className="text-xs text-emerald-300 product-availability">
              En stock
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
