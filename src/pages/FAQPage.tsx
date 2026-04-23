import { useEffect, useMemo, useState, type ReactNode } from "react";
import Card from "../components/common/Card";
import CollapsibleBox from "../components/common/CollapsibleBox";
import PageTitle from "../components/common/PageTitle";

type FaqSectionDefinition = {
  id: string;
  title: string;
};

type FaqSection = FaqSectionDefinition & {
  html: string;
};

type FaqTheme = "all" | "rules" | "team" | "market" | "training" | "races";

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

const faqHighlights: Array<{ label: string; value: ReactNode }> = [
  { label: "Source", value: "FAQ HTML officielle" },
  { label: "Organisation", value: "Rubriques fidèles + sommaire latéral" },
  { label: "Objectif", value: "Reprendre la mise en forme native du site" },
];

const faqQuickStartEntries = [
  { id: "la-saison", reason: "Comprendre le rythme 10 semaines et la logique des phases." },
  { id: "entrainement", reason: "Eviter les erreurs de forme et les choix d'entraînement incohérents." },
  { id: "transferts", reason: "Sécuriser achats/ventes sans dérive salariale." },
  { id: "odc", reason: "Poser des tactiques par défaut fiables en cas d'oubli." },
  { id: "installations", reason: "Prioriser les upgrades structurels vraiment rentables." },
];

const faqSectionThemes: Record<string, FaqTheme[]> = {
  "but-du-jeu": ["rules"],
  "votre-equipe": ["team"],
  "les-coureurs": ["team"],
  "les-courses": ["races"],
  assistant: ["rules"],
  "la-saison": ["rules"],
  championnats: ["races", "rules"],
  "championnat-pro": ["races"],
  "equipes-fantomes": ["rules"],
  "championnats-jeunes": ["races"],
  finances: ["rules"],
  intersaison: ["rules", "team"],
  transferts: ["market"],
  "coureurs-amateurs": ["market"],
  entrainement: ["training"],
  installations: ["training", "team"],
  "les-points": ["rules"],
  "les-primes": ["rules"],
  odc: ["races"],
  "odc-defaut": ["races"],
  materiel: ["team"],
  "courses-libres": ["races"],
  "editeur-profils": ["races"],
  crem: ["rules"],
  "cym-ranking": ["rules"],
  background: ["rules"],
  tchat: ["rules"],
  reinitialiser: ["team"],
};

const faqThemeLabels: Array<{ id: FaqTheme; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "rules", label: "Règles" },
  { id: "team", label: "Équipe" },
  { id: "market", label: "Transferts" },
  { id: "training", label: "Entraînement" },
  { id: "races", label: "Courses" },
];

const FAQ_PREFS_KEY = "cymanager:faq:v2:prefs";

type FaqPrefs = {
  viewMode: "quick" | "reference";
  showAllSections: boolean;
  activeSectionId: string;
  searchQuery: string;
  selectedTheme: FaqTheme;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(value: string, query: string): ReactNode {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return value;
  }

  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, "gi");
  const parts = value.split(regex);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${part}-${index}`} className="search-highlight">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function highlightHtmlContent(html: string, query: string): string {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return html;
  }

  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = documentRoot.getElementById("root");

  if (!root) {
    return html;
  }

  const regex = new RegExp(escapeRegExp(trimmed), "gi");
  const walker = documentRoot.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const value = textNode.nodeValue ?? "";

    if (!regex.test(value)) {
      return;
    }

    regex.lastIndex = 0;
    const fragment = documentRoot.createDocumentFragment();
    let lastIndex = 0;

    value.replace(regex, (match, offset) => {
      if (offset > lastIndex) {
        fragment.appendChild(documentRoot.createTextNode(value.slice(lastIndex, offset)));
      }

      const mark = documentRoot.createElement("mark");
      mark.className = "search-highlight";
      mark.textContent = match;
      fragment.appendChild(mark);
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < value.length) {
      fragment.appendChild(documentRoot.createTextNode(value.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return root.innerHTML;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function loadFaqPrefs(): FaqPrefs {
  try {
    const raw = localStorage.getItem(FAQ_PREFS_KEY);

    if (!raw) {
      return {
        viewMode: "quick",
        showAllSections: false,
        activeSectionId: sectionDefinitions[0]?.id ?? "but-du-jeu",
        searchQuery: "",
        selectedTheme: "all",
      };
    }

    const parsed = JSON.parse(raw) as Partial<FaqPrefs>;

    return {
      viewMode: parsed.viewMode === "reference" ? "reference" : "quick",
      showAllSections: parsed.showAllSections === true,
      activeSectionId:
        typeof parsed.activeSectionId === "string" && parsed.activeSectionId.length > 0
          ? parsed.activeSectionId
          : sectionDefinitions[0]?.id ?? "but-du-jeu",
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
      selectedTheme:
        parsed.selectedTheme === "rules" ||
        parsed.selectedTheme === "team" ||
        parsed.selectedTheme === "market" ||
        parsed.selectedTheme === "training" ||
        parsed.selectedTheme === "races"
          ? parsed.selectedTheme
          : "all",
    };
  } catch {
    return {
      viewMode: "quick",
      showAllSections: false,
      activeSectionId: sectionDefinitions[0]?.id ?? "but-du-jeu",
      searchQuery: "",
      selectedTheme: "all",
    };
  }
}

export default function FAQPage() {
  const initialPrefs = useMemo(() => loadFaqPrefs(), []);
  const [faqSections, setFaqSections] = useState<FaqSection[]>([]);
  const [loadingState, setLoadingState] = useState<"loading" | "ready" | "error">("loading");
  const [viewMode, setViewMode] = useState<"quick" | "reference">(initialPrefs.viewMode);
  const [showAllSections, setShowAllSections] = useState(initialPrefs.showAllSections);
  const [activeSectionId, setActiveSectionId] = useState(initialPrefs.activeSectionId);
  const [searchQuery, setSearchQuery] = useState(initialPrefs.searchQuery);
  const [selectedTheme, setSelectedTheme] = useState<FaqTheme>(initialPrefs.selectedTheme);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("fr");

  const filteredFaqSections = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return faqSections.filter((section) =>
        selectedTheme === "all"
          ? true
          : (faqSectionThemes[section.id] ?? []).includes(selectedTheme)
      );
    }

    return faqSections.filter((section) => {
      if (
        selectedTheme !== "all" &&
        !(faqSectionThemes[section.id] ?? []).includes(selectedTheme)
      ) {
        return false;
      }

      const plainText = stripHtmlTags(section.html).slice(0, 1500);
      const haystack = `${section.title} ${plainText}`.toLocaleLowerCase("fr");
      return haystack.includes(normalizedQuery);
    });
  }, [faqSections, normalizedQuery, selectedTheme]);

  const activeSection = useMemo(
    () => filteredFaqSections.find((section) => section.id === activeSectionId) ?? filteredFaqSections[0] ?? null,
    [activeSectionId, filteredFaqSections]
  );

  const quickStartSections = useMemo(() => {
    return faqQuickStartEntries
      .map((entry) => {
        const section = filteredFaqSections.find((candidate) => candidate.id === entry.id);

        if (!section) {
          return null;
        }

        return {
          ...entry,
          section,
        };
      })
      .filter((entry): entry is { id: string; reason: string; section: FaqSection } => entry !== null);
  }, [filteredFaqSections]);

  function handleSelectSection(sectionId: string) {
    setActiveSectionId(sectionId);
    setShowAllSections(false);
  }

  useEffect(() => {
    localStorage.setItem(
      FAQ_PREFS_KEY,
      JSON.stringify({
        viewMode,
        showAllSections,
        activeSectionId,
        searchQuery,
        selectedTheme,
      } satisfies FaqPrefs)
    );
  }, [viewMode, showAllSections, activeSectionId, searchQuery, selectedTheme]);

  const highlightedHtmlBySectionId = useMemo(() => {
    return filteredFaqSections.reduce<Record<string, string>>((acc, section) => {
      acc[section.id] = highlightHtmlContent(section.html, normalizedQuery);
      return acc;
    }, {});
  }, [filteredFaqSections, normalizedQuery]);

  useEffect(() => {
    if (!activeSection) {
      return;
    }

    if (activeSection.id !== activeSectionId) {
      setActiveSectionId(activeSection.id);
    }
  }, [activeSection, activeSectionId]);

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
        subtitle="Version V2: accès rapide aux réponses critiques puis navigation compacte par rubrique."
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

      {loadingState === "ready" ? (
        <Card className="guide-mode-card">
          <div className="guide-mode-switch">
            <button
              type="button"
              className={viewMode === "quick" ? "tab-btn tab-btn-active" : "tab-btn"}
              onClick={() => setViewMode("quick")}
            >
              QuickStart FAQ
            </button>
            <button
              type="button"
              className={viewMode === "reference" ? "tab-btn tab-btn-active" : "tab-btn"}
              onClick={() => setViewMode("reference")}
            >
              Référence complète
            </button>
          </div>

            <div className="guide-search-row">
              <input
                type="search"
                className="input guide-search-input"
                placeholder="Rechercher une rubrique FAQ"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery.trim().length > 0 ? (
                <button type="button" className="ghost-button" onClick={() => setSearchQuery("")}>
                  Effacer
                </button>
              ) : null}
            </div>

          <div className="guide-theme-row" role="list" aria-label="Filtres FAQ">
            {faqThemeLabels.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={selectedTheme === theme.id ? "guide-theme-chip is-active" : "guide-theme-chip"}
                onClick={() => setSelectedTheme(theme.id)}
              >
                {theme.label}
              </button>
            ))}
          </div>

          {viewMode === "quick" ? (
            <div className="guide-quickstart-grid">
              {quickStartSections.map((entry) => (
                <article key={entry.id} className="guide-quickstart-step">
                  <p className="guide-kicker">{highlightText(entry.section.title, searchQuery)}</p>
                  <p>{highlightText(entry.reason, searchQuery)}</p>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setViewMode("reference");
                      handleSelectSection(entry.id);
                    }}
                  >
                    Ouvrir la réponse
                  </button>
                </article>
              ))}

              {quickStartSections.length === 0 ? (
                <p className="muted">Aucun résultat pour cette recherche dans le QuickStart FAQ.</p>
              ) : null}
            </div>
          ) : (
            <div className="guide-reference-layout">
              <div className="guide-reference-toolbar">
                <label className="guide-reference-select-label" htmlFor="faq-section-select">
                  Rubrique active
                </label>
                <select
                  id="faq-section-select"
                  className="input guide-reference-select"
                  value={activeSection?.id ?? ""}
                  onChange={(event) => handleSelectSection(event.target.value)}
                >
                  {filteredFaqSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowAllSections((current) => !current)}
                >
                  {showAllSections ? "Afficher uniquement la rubrique active" : "Afficher toutes les rubriques"}
                </button>
              </div>

              {showAllSections ? (
                <div className="guide-content">
                  {filteredFaqSections.map((section) => (
                    <CollapsibleBox
                      key={section.id}
                      title={section.title}
                      defaultExpanded={section.id === activeSectionId}
                    >
                      <section id={section.id} className="guide-section-anchor">
                        <div className="faq-content">
                          <div
                            className="faq-html-content"
                            dangerouslySetInnerHTML={{ __html: highlightedHtmlBySectionId[section.id] ?? section.html }}
                          />
                        </div>
                      </section>
                    </CollapsibleBox>
                  ))}

                  {filteredFaqSections.length === 0 ? (
                    <p className="muted">Aucune rubrique ne correspond à cette recherche.</p>
                  ) : null}
                </div>
              ) : activeSection ? (
                <Card>
                  <section id={activeSection.id} className="guide-section-anchor">
                    <header className="guide-section-header">
                      <p className="guide-kicker">FAQ</p>
                      <h3 className="guide-section-title">{highlightText(activeSection.title, searchQuery)}</h3>
                    </header>

                    <div className="faq-content">
                      <div
                        className="faq-html-content"
                        dangerouslySetInnerHTML={{ __html: highlightedHtmlBySectionId[activeSection.id] ?? activeSection.html }}
                      />
                    </div>
                  </section>
                </Card>
              ) : (
                <p className="muted">Aucune rubrique ne correspond à cette recherche.</p>
              )}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
