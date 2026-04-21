import { useEffect, useState, type ReactNode } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";

type FaqSectionDefinition = {
  id: string;
  title: string;
};

type FaqSection = FaqSectionDefinition & {
  html: string;
};

const sectionDefinitions: FaqSectionDefinition[] = [
  { id: "but-du-jeu", title: "But du jeu" },
  { id: "votre-equipe", title: "Votre équipe" },
  { id: "les-coureurs", title: "Les coureurs" },
  { id: "les-courses", title: "Les courses" },
  { id: "assistant", title: "Votre assistant à votre rescousse" },
  { id: "la-saison", title: "La saison" },
  { id: "championnats", title: "Les Championnats professionels et jeunes" },
  { id: "championnat-pro", title: "Championnat Pro" },
  { id: "equipes-fantomes", title: "Equipes Fantômes (mécanisme et incidence)" },
  { id: "championnats-jeunes", title: "Championnats U21 & U25" },
  { id: "finances", title: "Finances" },
  { id: "intersaison", title: "Intersaison" },
  { id: "transferts", title: "Transferts" },
  { id: "coureurs-amateurs", title: "Les coureurs amateurs" },
  { id: "entrainement", title: "Entraînement / Entraîneur" },
  { id: "installations", title: "Les installations" },
  { id: "les-points", title: "Les points" },
  { id: "les-primes", title: "Les primes" },
  { id: "odc", title: "Ordres de Course (ODC)" },
  { id: "odc-defaut", title: "Les ODC par défaut" },
  { id: "materiel", title: "Matériel" },
  { id: "courses-libres", title: "Courses libres" },
  { id: "editeur-profils", title: "Editeur de profils de course" },
  { id: "crem", title: "CREM - Triche" },
  { id: "cym-ranking", title: "Cym Ranking" },
  { id: "background", title: "Background, RP, HRP: qu'est-ce donc?" },
  { id: "tchat", title: "Tchat" },
  { id: "reinitialiser", title: "Réinitialiser son équipe" },
];

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function getContentNodes(contentElement: Element) {
  return Array.from(contentElement.childNodes).filter((node) => normalizeText(node.textContent ?? "") !== "");
}

function findMarkerIndex(nodes: ChildNode[], marker: string) {
  return nodes.findIndex((node) => normalizeText(node.textContent ?? "").startsWith(marker));
}

function sanitizeSectionHtml(rawSectionHtml: string) {
  const parsedDocument = new DOMParser().parseFromString(`<div id="faq-root">${rawSectionHtml}</div>`, "text/html");
  const root = parsedDocument.getElementById("faq-root");

  if (!root) {
    return rawSectionHtml.trim();
  }

  root.querySelectorAll("img").forEach((image) => image.remove());

  root.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || href.startsWith("#")) {
      return;
    }

    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noreferrer");
  });

  root.querySelectorAll("table").forEach((table) => {
    table.classList.add("guide-table", "faq-table");
    table.removeAttribute("style");

    const wrapper = parsedDocument.createElement("div");
    wrapper.className = "guide-table-wrap";

    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });

  return root.innerHTML.trim();
}

function cloneNodesToHtml(parsedDocument: Document, nodes: ChildNode[]) {
  const wrapper = parsedDocument.createElement("div");

  nodes.forEach((node) => {
    wrapper.appendChild(node.cloneNode(true));
  });

  return sanitizeSectionHtml(wrapper.innerHTML);
}

function buildSectionsFromHtml(rawHtml: string): FaqSection[] {
  const parsedDocument = new DOMParser().parseFromString(rawHtml, "text/html");
  const portletMap = new Map<string, Element>();

  parsedDocument.querySelectorAll(".portlet_boite").forEach((box) => {
    const title = normalizeText(box.querySelector(".portlet_titre")?.textContent ?? "");
    const content = box.querySelector(".portlet_contenu");

    if (title && content) {
      portletMap.set(title, content);
    }
  });

  const emptyContent = parsedDocument.createElement("div");
  const directSection = (title: string) => sanitizeSectionHtml(portletMap.get(title)?.innerHTML ?? "");

  const coursesNodes = getContentNodes(portletMap.get("Les courses") ?? emptyContent);
  const assistantStart = findMarkerIndex(coursesNodes, "Votre assistant à votre rescousse");

  const championshipNodes = getContentNodes(portletMap.get("Les Championnats professionels et jeunes") ?? emptyContent);
  const championnatProStart = findMarkerIndex(championshipNodes, "Championnat Pro");
  const equipesFantomesStart = findMarkerIndex(championshipNodes, "Equipes Fantômes");
  const championnatsJeunesStart = findMarkerIndex(championshipNodes, "Championnats U21");

  const transfertsNodes = getContentNodes(portletMap.get("Transferts") ?? emptyContent);
  const amateursStart = findMarkerIndex(transfertsNodes, "Les coureurs amateurs");

  const odcNodes = getContentNodes(portletMap.get("Ordres de Course (ODC)") ?? emptyContent);
  const odcDefautStart = findMarkerIndex(odcNodes, "Les ODC par défaut");

  const sectionHtmlById: Record<string, string> = {
    "but-du-jeu": directSection("But du jeu"),
    "votre-equipe": directSection("Votre équipe"),
    "les-coureurs": directSection("Les coureurs"),
    "les-courses": cloneNodesToHtml(parsedDocument, assistantStart === -1 ? coursesNodes : coursesNodes.slice(0, assistantStart)),
    assistant: assistantStart === -1 ? "" : cloneNodesToHtml(parsedDocument, coursesNodes.slice(assistantStart + 1)),
    "la-saison": directSection("La saison"),
    championnats:
      championnatProStart === -1
        ? directSection("Les Championnats professionels et jeunes")
        : cloneNodesToHtml(parsedDocument, championshipNodes.slice(0, championnatProStart)),
    "championnat-pro":
      championnatProStart === -1
        ? ""
        : cloneNodesToHtml(
            parsedDocument,
            championshipNodes.slice(championnatProStart + 1, equipesFantomesStart === -1 ? championshipNodes.length : equipesFantomesStart),
          ),
    "equipes-fantomes":
      equipesFantomesStart === -1
        ? ""
        : cloneNodesToHtml(
            parsedDocument,
            championshipNodes.slice(equipesFantomesStart + 1, championnatsJeunesStart === -1 ? championshipNodes.length : championnatsJeunesStart),
          ),
    "championnats-jeunes":
      championnatsJeunesStart === -1 ? "" : cloneNodesToHtml(parsedDocument, championshipNodes.slice(championnatsJeunesStart + 1)),
    finances: directSection("Finances"),
    intersaison: directSection("Intersaison"),
    transferts: amateursStart === -1 ? directSection("Transferts") : cloneNodesToHtml(parsedDocument, transfertsNodes.slice(0, amateursStart)),
    "coureurs-amateurs": amateursStart === -1 ? "" : cloneNodesToHtml(parsedDocument, transfertsNodes.slice(amateursStart + 1)),
    entrainement: directSection("Entraînement / Entraîneur"),
    installations: directSection("Les installations"),
    "les-points": directSection("Les points"),
    "les-primes": directSection("Les primes"),
    odc: odcDefautStart === -1 ? directSection("Ordres de Course (ODC)") : cloneNodesToHtml(parsedDocument, odcNodes.slice(0, odcDefautStart)),
    "odc-defaut": odcDefautStart === -1 ? "" : cloneNodesToHtml(parsedDocument, odcNodes.slice(odcDefautStart + 1)),
    materiel: directSection("Matériel"),
    "courses-libres": directSection("Courses libres"),
    "editeur-profils": directSection("Editeur de profils de course"),
    crem: directSection("CREM - Triche"),
    "cym-ranking": directSection("Cym Ranking"),
    background: directSection("Background, RP, HRP: qu'est-ce donc?"),
    tchat: directSection("Tchat"),
    reinitialiser: directSection("Réinitialiser son équipe"),
  };

  return sectionDefinitions
    .map((definition) => ({
      ...definition,
      html: sectionHtmlById[definition.id] ?? "",
    }))
    .filter((section) => section.html.length > 0);
}

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId);

  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
}

const faqHighlights: Array<{ label: string; value: ReactNode }> = [
  { label: "Source", value: "FAQ HTML officielle" },
  { label: "Organisation", value: "Rubriques fidèles + sommaire latéral" },
  { label: "Objectif", value: "Reprendre la mise en forme native du site" },
];

export default function FAQPage() {
  const [faqSections, setFaqSections] = useState<FaqSection[]>([]);
  const [loadingState, setLoadingState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadFaq() {
      setLoadingState("loading");

      try {
        const module = await import("../assets/data/cymanager-faq-reference.html?raw");

        if (cancelled) {
          return;
        }

        setFaqSections(buildSectionsFromHtml(module.default));
        setLoadingState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Erreur de chargement FAQ", error);
        setFaqSections([]);
        setLoadingState("error");
      }
    }

    loadFaq();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadingState !== "ready" || faqSections.length === 0) {
      return;
    }

    const validIds = new Set(faqSections.map((section) => section.id));

    function applyHashNavigation() {
      const hash = window.location.hash.replace("#", "").trim();

      if (!hash || !validIds.has(hash)) {
        return;
      }

      const target = document.getElementById(hash);

      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Délai court pour garantir que le DOM est peint avant le scroll initial.
    const timer = window.setTimeout(applyHashNavigation, 0);
    window.addEventListener("hashchange", applyHashNavigation);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", applyHashNavigation);
    };
  }, [faqSections, loadingState]);

  return (
    <div className="page-stack">
      <PageTitle
        title="FAQ"
        subtitle="Reprise intégrale de la FAQ HTML avec navigation latérale et présentation cohérente avec le site."
      />

      <Card>
        <div className="guide-intro">
          <div className="guide-intro-copy">
            <p className="guide-kicker">FAQ officielle</p>
            <h3 className="guide-intro-title">Version calée sur la FAQ du site</h3>
            <p className="guide-intro-text">
              Le contenu ci-dessous reprend la structure HTML de référence pour conserver les paragraphes, listes et tableaux au plus proche de la source.
            </p>
          </div>

          <div className="faq-highlight-grid">
            {faqHighlights.map((item) => (
              <div key={item.label} className="guide-highlight-card">
                <span className="guide-highlight-label">{item.label}</span>
                <strong className="guide-highlight-value">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {loadingState === "loading" ? (
        <div className="message-box">
          <p className="muted">Chargement de la FAQ en cours...</p>
        </div>
      ) : null}

      {loadingState === "error" ? (
        <div className="message-box message-box-warning">
          <p>Impossible de charger la FAQ HTML. Réessaie un rechargement de la page.</p>
        </div>
      ) : null}

      <div className="guide-layout">
        <aside className="guide-toc card">
          <h3 className="card-title">Sommaire FAQ</h3>
          <nav className="guide-toc-nav">
            {faqSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className="guide-toc-link"
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className="guide-content">
          {faqSections.map((section) => (
            <Card key={section.id}>
              <section id={section.id} className="guide-section-anchor">
                <header className="guide-section-header">
                  <p className="guide-kicker">FAQ</p>
                  <h3 className="guide-section-title">{section.title}</h3>
                </header>

                <div className="faq-content">
                  <div className="faq-html-content" dangerouslySetInnerHTML={{ __html: section.html }} />
                </div>
              </section>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
