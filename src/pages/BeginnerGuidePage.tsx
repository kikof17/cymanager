import type { ReactNode } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";

type GuideSection = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  content: ReactNode;
};

type GuideCalloutTone = "info" | "warning" | "success";

type GuideCalloutProps = {
  title: string;
  tone?: GuideCalloutTone;
  children: ReactNode;
};

type GuideTableProps = {
  headers: string[];
  rows: ReactNode[][];
};

function GuideCallout({ title, tone = "info", children }: GuideCalloutProps) {
  return (
    <div className={`guide-callout guide-callout-${tone}`}>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

function GuideTable({ headers, rows }: GuideTableProps) {
  return (
    <div className="guide-table-wrap">
      <table className="guide-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${headers[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections: GuideSection[] = [
  {
    id: "premiers-reperes",
    title: "1. Premiers repères",
    kicker: "Base de départ",
    summary:
      "Ce que tu reçois à la création, ce que cela implique et les premiers délais à avoir en tête.",
    content: (
      <>
        <p>
          Quand tu crées ton équipe, tu démarres avec une base fonctionnelle, mais très
          loin d'un club déjà structuré. L'objectif des premières semaines n'est pas
          de tout optimiser en même temps. Il faut d'abord comprendre ce que tu as,
          sécuriser la trésorerie et éviter les dépenses qui te bloquent à moyen terme.
        </p>

        <GuideTable
          headers={["Élément", "Point de départ", "Lecture utile"]}
          rows={[
            ["Effectif", "10 coureurs", "De quoi courir rapidement, pas forcément de quoi former intelligemment."],
            ["Siège social", "Niveau 1", "Revenu stable lié à la division et au classement."],
            ["Boutique", "Niveau 1", "Revenu variable selon les résultats sportifs."],
            ["Entraîneur", "Cantonal", "Suffisant pour survivre, insuffisant pour former sérieusement."],
            ["Matériel", "Vélos basiques", "Pas une priorité de dépense au lancement."],
            ["Trésorerie", "1 000 000 €", "Le capital de départ doit surtout servir à structurer le club."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Ce qu'il faut retenir tout de suite</h4>
          <ul className="clean-list">
            <li>Une saison dure 10 semaines, soit environ 5 saisons par an IRL.</li>
            <li>Le sponsor verse encore 500 000 € après 10 semaines, puis 500 000 € après 20 semaines.</li>
            <li>Le million de départ n'est pas un budget de luxe, c'est un budget de construction.</li>
            <li>Tu peux compléter ton profil forum et y rattacher tes équipes, mais ce n'est pas le sujet urgent au lancement.</li>
          </ul>
        </div>

        <GuideCallout title="Cap financier réel" tone="success">
          <p>
            En raisonnant proprement, ton démarrage ne repose pas seulement sur 1 000 000 €.
            Tu as aussi deux paliers sponsorisés qui sécurisent la transition vers les
            saisons 2 et 3. Cela permet de prioriser les installations plutôt que les achats impulsifs.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "lire-division",
    title: "2. Lire l'interface et la division",
    kicker: "Diagnostic",
    summary:
      "Avant de toucher à l'entraînement ou au marché, il faut situer ton club dans son environnement.",
    content: (
      <>
        <p>
          La pire erreur de départ consiste à juger son équipe dans l'absolu. Sur CyManager,
          ce qui compte est relatif: ta division, les catégories Pro/U25/U21, la qualité
          moyenne des concurrents et le type de calendrier que tu peux réellement exploiter.
        </p>

        <div className="guide-subsection">
          <h4>Le bloc d'infos à ne pas ignorer</h4>
          <ul className="clean-list">
            <li>La saison et la semaine en cours te donnent le rythme économique et sportif.</li>
            <li>Le nom d'équipe et l'ID servent d'identifiant dans tout l'écosystème du jeu.</li>
            <li>La division affichée doit être lue séparément pour les catégories Pro, U25 et U21.</li>
            <li>Le classement Pro, la caisse et le niveau des installations donnent immédiatement ton état réel.</li>
          </ul>
        </div>

        <GuideTable
          headers={["Page à consulter", "Ce que tu y cherches", "Décision que cela alimente"]}
          rows={[
            ["Classement", "Position de ton équipe et volume de points", "Savoir si tu joues la survie, la progression ou déjà les primes."],
            ["Statistiques division - valeur", "Niveau moyen des effectifs", "Mesurer l'écart de puissance brute."],
            ["Statistiques division - salaires", "Poids financier des équipes concurrentes", "Éviter de te comparer à des clubs à structure bien supérieure."],
            ["Top notes", "Profils vraiment performants dans ta division", "Identifier les caractéristiques qui décident les résultats locaux."],
          ]}
        />

        <GuideCallout title="Erreur classique" tone="warning">
          <p>
            Entraîner un coureur parce qu'une note paraît belle sur sa fiche sans avoir
            vérifié le niveau moyen de la division. Une progression utile en division 6 peut
            être totalement insuffisante en division 4, et inversement tu peux surpayer trop tôt une montée inutile.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "comprendre-coureur",
    title: "3. Comprendre un coureur",
    kicker: "Lecture de fiche",
    summary:
      "Primaires, secondaires, foncier, BAR, CAE, XP: sans cette lecture, tout le reste est bancal.",
    content: (
      <>
        <div className="guide-two-cols">
          <div className="guide-callout">
            <strong>Caractéristiques primaires</strong>
            <ul className="clean-list">
              <li>Plaine</li>
              <li>Vallon</li>
              <li>Sprint</li>
              <li>Montagne</li>
              <li>Baroudeur</li>
              <li>CLM</li>
              <li>Course à étapes</li>
            </ul>
          </div>

          <div className="guide-callout">
            <strong>Caractéristiques secondaires</strong>
            <ul className="clean-list">
              <li>Endurance</li>
              <li>Résistance</li>
              <li>Récupération</li>
              <li>Agilité</li>
              <li>Descente</li>
            </ul>
          </div>
        </div>

        <p>
          Le foncier est la somme endurance + résistance + récupération. Il intervient
          partout. Un coureur avec une primaire très brillante mais un foncier creux coûte
          vite cher et sous-performe régulièrement. BAR et CAE complètent la lecture:
          le premier aide en plaine, vallon et pavé, et facilite les échappées; le second
          pèse sur les courses à étapes. L'XP, elle, progresse principalement en course.
        </p>

        <GuideTable
          headers={["Type de course", "Noyau principal", "Complément utile"]}
          rows={[
            ["Plaine", "Plaine + Endurance + Sprint", "BAR et forme élevée améliorent le rendement."],
            ["Vallon", "Vallon + Résistance + Sprint", "L'endurance pèse davantage au-delà de 200 km."],
            ["Montagne", "Montagne + Descente + Récupération", "L'endurance compte sur les longues distances."],
            ["CLM", "CLM + Résistance + Récupération", "Le profil réel peut faire varier l'importance d'autres notes."],
            ["Pavé", "Pavé + Résistance + Sprint", "Plaine ou vallon peuvent peser selon le profil exact."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Repères simples pour un débutant</h4>
          <ul className="clean-list">
            <li>Un bon profil de départ a souvent un foncier entre 50 et 70 sur chaque note clé.</li>
            <li>Des primaires entre 50 et 70, bien réparties, valent mieux qu'une note isolée trop haute.</li>
            <li>La fiche d'un coureur doit toujours être lue avec son âge, sa forme, sa catégorie et son salaire.</li>
            <li>Jusqu'à 19 ans et 10 semaines, tu peux encore renommer le coureur et ajuster sa présentation.</li>
          </ul>
        </div>

        <GuideCallout title="Réflexe sain" tone="success">
          <p>
            Ne lis jamais une note seule. Lis toujours un triplet: profil de course,
            foncier, âge. C'est cette combinaison qui dit si un coureur est utile,
            formable, revendable ou simplement coûteux.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "tirage-initial",
    title: "4. Auditer le tirage initial",
    kicker: "Tri du roster",
    summary:
      "Le tirage de base n'est pas fait pour être gardé tel quel. Il sert d'entrée de jeu à analyser et à hiérarchiser.",
    content: (
      <>
        <p>
          Avec un effectif de départ, il faut identifier les coureurs qui vont servir à
          faire des points et des primes rapidement, ceux qui ont une vraie marge de
          progression et ceux que tu ne pourras pas former correctement avec tes moyens.
          Le tri se fait d'abord par âge, puis par foncier, puis par cohérence avec ta structure.
        </p>

        <div className="guide-subsection">
          <h4>Checklist de tri</h4>
          <ul className="clean-list">
            <li>Garder les Pros corrects qui peuvent rapporter vite sur C1 et C2.</li>
            <li>Évaluer les U25 et U21 en fonction de ta capacité réelle à les former.</li>
            <li>Se méfier des jeunes intéressants sur le papier mais impossibles à développer sans CDE solide et entraîneur adapté.</li>
            <li>Repérer les salaires déjà gênants par rapport au rendement attendu.</li>
            <li>Comparer le potentiel de vente à l'intérêt sportif immédiat.</li>
          </ul>
        </div>

        <div className="guide-subsection">
          <h4>ODC de base et réglages par défaut</h4>
          <ul className="clean-list">
            <li>Pour une équipe débutante, l'électron libre reste souvent le rôle le plus propre par défaut.</li>
            <li>Le pourcentage n'a de sens que pour les leaders et équipiers, pas pour l'électron libre.</li>
            <li>Il vaut mieux retirer la logique d'échappée matinale sur des coureurs fragiles en forme.</li>
            <li>Les ODC par défaut servent surtout de filet de sécurité en cas d'oubli d'inscription ou de tactique.</li>
          </ul>
        </div>

        <GuideCallout title="Moment clé" tone="warning">
          <p>
            Ne vends pas et n'achète pas tout avant d'avoir au moins observé une première
            confrontation avec ta division. La première course te donne un repère concret
            sur l'écart réel entre tes coureurs et la concurrence.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "entrainement",
    title: "5. Entraînement des premières semaines",
    kicker: "Progression",
    summary:
      "Le bon entraînement de départ cherche d'abord à rendre un effectif jouable, pas à fabriquer artificiellement une star.",
    content: (
      <>
        <p>
          L'entraînement hebdomadaire est le cœur de la progression. Il a lieu dans la
          nuit du mercredi au jeudi. Avec un entraîneur cantonal et un centre d'entraînement
          faible, les gains sont modestes. C'est normal. Les premières semaines servent
          surtout à construire une base de foncier et à éviter les pertes de forme mal gérées.
        </p>

        <GuideTable
          headers={["Entraînement", "Primaire", "Secondaires"]}
          rows={[
            ["Foncier", "Endurance", "Récupération / Plaine"],
            ["Vallon", "Vallon", "Résistance / Sprint"],
            ["Sprint", "Sprint", "Résistance / Agilité"],
            ["CLM", "CLM", "Résistance / Récupération"],
            ["Plaine", "Plaine", "Sprint / Endurance"],
            ["Pavé", "Pavé", "Résistance / Agilité"],
            ["Montagne", "Montagne", "Récupération / Descente"],
            ["Baroudeur", "BAR", "Vallon / Descente"],
            ["Course à étapes", "CAE", "Montagne / Récupération"],
          ]}
        />

        <GuideTable
          headers={["Intensité", "Effet sur la forme", "Logique pour un débutant"]}
          rows={[
            ["Tranquille", "Forte récupération de forme, gains sportifs plus lents", "Très utile pour des coureurs usés ou lors d'une semaine à risque."],
            ["Normal", "Compromis le plus propre", "Réglage standard recommandé au démarrage."],
            ["Intensif", "Pénalise la forme", "À éviter au lancement avec structure faible."],
          ]}
        />

        <GuideTable
          headers={["Cible de foncier", "Profil de coureur", "Lecture pratique"]}
          rows={[
            ["200 points", "Primaires ≤ 70", "Base correcte pour divisions basses."],
            ["240 points", "Primaires ≤ 80", "Seuil raisonnable pour divisions 3 à 5."],
            ["280 points", "Primaires ≤ 85", "Niveau déjà solide pour grimper."],
            ["300 points", "Primaires ≤ 90", "Profil haut niveau, très coûteux à maintenir."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Règles pratiques à ne pas oublier</h4>
          <ul className="clean-list">
            <li>Choisis trois entraînements maximum et essaie de couvrir le plus de besoins individuels possibles.</li>
            <li>Les blessés ne s'entraînent pas, seule leur forme remonte selon le couple entraîneur/CDE.</li>
            <li>Les coureurs engagés sur un tour ne profitent pas normalement de l'entraînement hebdomadaire.</li>
            <li>À partir de 32 ans, les caractéristiques baissent progressivement.</li>
            <li>L'XP ne monte qu'avec les courses, pas avec l'entraînement.</li>
          </ul>
        </div>

        <GuideCallout title="Ce qu'il faut viser" tone="warning">
          <p>
            Au départ, cherche surtout à corriger les trous qui empêchent un coureur de
            performer ou de progresser. Monter une primaire trop tôt fait grimper le salaire
            beaucoup plus vite que les secondaires et peut te bloquer financièrement.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "investissements",
    title: "6. Utiliser le million intelligemment",
    kicker: "Priorités budgétaires",
    summary:
      "Le capital initial doit d'abord solidifier les revenus et l'entraînement, pas flatter l'effectif.",
    content: (
      <>
        <p>
          Le document source défend une logique très claire: un débutant doit surtout
          sécuriser ses installations de rendement et son centre d'entraînement. Acheter
          trop tôt des coureurs ou un entraîneur trop ambitieux sans structure cohérente
          produit rarement un bon résultat.
        </p>

        <GuideTable
          headers={["Décision", "Coût indicatif", "Moment conseillé", "Pourquoi"]}
          rows={[
            ["Boutique niveau 2", "200 000 €", "Lundi", "Augmente un revenu lié aux résultats et reste rentable tôt."],
            ["Siège social niveau 2", "200 000 €", "Lundi", "Améliore le revenu sponsor, plus stable que la boutique."],
            ["Centre d'entraînement niveau 1", "150 000 €", "Dès que possible, idéalement un jeudi", "C'est la base du développement sportif."],
            ["Réserve de caisse", "Environ 450 000 € restants", "Immédiat", "Absorbe salaires, entretien et futur palier d'installation."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Ce qu'un débutant doit rarement faire trop tôt</h4>
          <ul className="clean-list">
            <li>Construire un centre de formation avant d'avoir au moins un CDE 4 et un entraîneur mondial.</li>
            <li>Acheter du matériel de haut niveau avant les divisions supérieures.</li>
            <li>Prendre un entraîneur coûteux alors que le CDE ne suit pas.</li>
            <li>Consommer toute la trésorerie dans un ou deux transferts spectaculaires.</li>
          </ul>
        </div>

        <GuideCallout title="Ordre de marche propre" tone="success">
          <p>
            Boutique, siège social, centre d'entraînement, puis seulement arbitrages de marché.
            Cette hiérarchie te laisse une équipe moins glamour au départ, mais beaucoup plus stable
            après quelques semaines.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "achats-transferts",
    title: "7. Acheter sur le marché des transferts",
    kicker: "Renforts",
    summary:
      "Un bon achat de débutant est raisonnable, rentable et compatible avec la masse salariale du club.",
    content: (
      <>
        <p>
          Le marché n'est pas là pour te faire rêver, il est là pour corriger un effectif.
          Pour un débutant, la logique la plus propre consiste souvent à viser des vétérans
          encore utiles, déjà formés, avec un salaire supportable et une vraie cohérence de profil.
        </p>

        <div className="guide-subsection">
          <h4>Filtres simples pour chercher intelligemment</h4>
          <ul className="clean-list">
            <li>Âge: 31 ans minimum, voire 32 ans et plus pour profiter de prix plus bas.</li>
            <li>Budget: éviter de dépasser 200 000 € par renfort au lancement.</li>
            <li>Foncier: viser au moins 50 partout, et idéalement 200 points cumulés pour une division basse.</li>
            <li>Forme: privilégier les coureurs déjà en état de courir.</li>
            <li>BAR et CAE: ne pas les négliger, même chez un coureur au profil correct.</li>
          </ul>
        </div>

        <GuideTable
          headers={["Signal d'alerte", "Pourquoi il faut fuir"]}
          rows={[
            ["Mono-caractéristique", "Une note énorme n'efface pas un foncier déplorable ou un sprint absent."],
            ["Salaire ingérable", "Même un excellent coureur peut ruiner une petite division si son salaire dépasse sa capacité à rapporter."],
            ["BAR / CAE trop bas", "Le rendement en course est plus faible que ce que la fiche laisse croire."],
            ["Forme basse", "Tu paies un coureur qui n'est pas immédiatement exploitable."],
            ["Foncier troué", "Une seule note catastrophique casse l'ensemble du profil."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Moments souvent favorables pour acheter</h4>
          <ul className="clean-list">
            <li>La dernière semaine d'une saison.</li>
            <li>Juste après un tour, quand certaines équipes dégraissent.</li>
            <li>Le dimanche avant la mise à jour économique, quand des managers cherchent à alléger la masse salariale.</li>
            <li>Les amateurs peuvent aussi offrir des solutions plus saines pour les jeunes équipes si les conditions de division le permettent.</li>
          </ul>
        </div>

        <GuideCallout title="Discipline d'enchère" tone="warning">
          <p>
            Ne te laisse pas embarquer par la surenchère. Si le prix visé est dépassé,
            tu sors. Le banquier empêchera l'enchère de trop, mais il ne réparera ni la perte
            de temps ni le mauvais processus de décision.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "ventes-transferts",
    title: "8. Vendre utilement",
    kicker: "Sorties d'effectif",
    summary:
      "Une vente propre est réaliste sur le prix, bien timée et pensée en fonction du marché, pas de l'ego.",
    content: (
      <>
        <p>
          Les ventes servent à libérer de la masse salariale, à financer les installations
          et à sortir de l'effectif des profils que tu ne peux pas rentabiliser. Mettre un
          coureur en vente trop cher, juste parce que sa fiche te plaît, revient souvent à perdre 3 000 € et du temps.
        </p>

        <GuideTable
          headers={["Règle", "Conséquence pratique"]}
          rows={[
            ["Coût de mise en vente", "3 000 € par vente, pour une durée de 3 jours."],
            ["Effectif minimum", "Avec seulement 5 coureurs, tu ne peux plus mettre en vente sans reconstituer temporairement un effectif suffisant."],
            ["Mise à prix", "De 0 € jusqu'au double de la valeur affichée du coureur."],
            ["Objectif", "Vendre ce qui bloque la progression ou ne rentabilisera jamais son salaire."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Fenêtres de vente intéressantes</h4>
          <ul className="clean-list">
            <li>Mercredi et jeudi, quand les managers ont les résultats en tête.</li>
            <li>Samedi et dimanche, en préparation ou juste après une grosse course.</li>
            <li>Entre 18h et 22h pour maximiser la présence d'acheteurs.</li>
            <li>Début de saison et phases autour des tours pour profiter des réallocations de budget.</li>
          </ul>
        </div>

        <GuideCallout title="Décision froide" tone="info">
          <p>
            Certains vieux coureurs faibles se vendent mal, même à prix cassé. Dans ces cas,
            une mise à prix très basse ou un licenciement peut être plus rationnel qu'une succession
            de ventes ratées qui grignotent la trésorerie.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "courses-tactiques",
    title: "9. Courses, profils et tactiques",
    kicker: "Exploitation sportive",
    summary:
      "Un débutant marque des points en choisissant bien ses courses et en protégeant la forme de ses coureurs.",
    content: (
      <>
        <p>
          Les inscriptions ferment la veille de la course à 22h00. Tu ne dois pas seulement
          inscrire les sept meilleurs. Il faut faire correspondre le profil de course,
          la catégorie, la forme et le rôle attribué à chaque coureur. Une semaine bien gérée
          rapporte plus qu'une accumulation de départs mal calibrés.
        </p>

        <GuideTable
          headers={["Format", "Public", "Rythme", "Ce qu'il faut savoir"]}
          rows={[
            ["C1", "Tous", "Souvent le dimanche", "Référence pour les primes et les points."],
            ["C2", "Tous", "Souvent le mercredi", "Primes et points divisés par deux par rapport à une C1."],
            ["C3", "U25", "Souvent le samedi", "Primes et points divisés par quatre."],
            ["C4", "U21", "Souvent le mardi", "Pas de primes, mais des points spécifiques pour les 15 premiers."],
            ["Grand tour / mini tour", "Selon calendrier", "Périodes spécifiques", "Les participants sacrifient une partie de l'entraînement hebdomadaire."],
          ]}
        />

        <GuideTable
          headers={["Rôle", "Utilité", "Perte de forme typique"]}
          rows={[
            ["Leader", "Coureur que l'équipe aide à performer", "Faible à modérée si l'encadrement est cohérent."],
            ["Équipier", "Sacrifie de l'énergie pour le leader", "La plus forte du trio, surtout si le curseur est haut."],
            ["Électron libre", "Se débrouille seul", "La plus simple à gérer, très utile au lancement."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Profils de course à reconnaître rapidement</h4>
          <ul className="clean-list">
            <li>Plaine: plaine, endurance, sprint.</li>
            <li>Vallon: vallon, résistance, sprint.</li>
            <li>Montagne: montagne, descente, récupération.</li>
            <li>Pavé: pavé, résistance, sprint, avec plaine ou vallon selon le tracé.</li>
            <li>CLM individuel: seul l'électron libre est réellement cohérent.</li>
            <li>TTT: la cohérence de l'équipe entière compte, pas seulement un leader isolé.</li>
          </ul>
        </div>

        <GuideCallout title="Point tactique important" tone="warning">
          <p>
            La gestion de l'échappée matinale est décisive. Si tu laisses le réglage libre,
            tes coureurs peuvent partir devant et subir une grosse perte de forme. Pour un club débutant,
            cela se paie très vite. La prudence reste souvent meilleure que l'agressivité.
          </p>
        </GuideCallout>

        <GuideCallout title="Règle d'or pour les jeunes" tone="success">
          <p>
            Tes U21 et U25 ouvrent des courses supplémentaires, mais leur forme s'épuise vite.
            Il faut cibler les départs, éviter les tours quand la structure d'entraînement est faible
            et accepter de faire des impasses pour protéger la progression.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "installations",
    title: "10. Installations et calendrier d'upgrade",
    kicker: "Structure du club",
    summary:
      "Les installations sont le vrai moteur de progression. Elles doivent être montées dans le bon ordre et au bon moment.",
    content: (
      <>
        <p>
          Le document source insiste sur une hiérarchie très nette. Le siège social et la
          boutique stabilisent les revenus. Le centre d'entraînement prépare le futur sportif.
          Le centre de formation ne devient logique qu'une fois le club déjà capable de former.
        </p>

        <GuideTable
          headers={["Installation", "Rôle", "Moment conseillé", "Précaution"]}
          rows={[
            ["Siège social", "Revenu sponsor stable", "Lundi pour optimiser les mises à jour", "Même en construction, tu gardes le revenu du niveau inférieur."],
            ["Boutique", "Revenu lié aux résultats", "Lundi", "Aucun revenu de boutique pendant les travaux."],
            ["Centre d'entraînement", "Progression des coureurs", "Jeudi", "À prioriser tôt, car il conditionne presque tout le reste."],
            ["Centre de formation", "Tirage de jeunes", "Jeudi, beaucoup plus tard", "À éviter tant que tu ne peux pas former sérieusement."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Logique de montée recommandée</h4>
          <ul className="clean-list">
            <li>SS1 et Boutique1: viser rapidement CDE2.</li>
            <li>SS2 et Boutique1 ou 2: viser CDE3 avec entraîneur intercontinental si possible.</li>
            <li>SS3 et Boutique3: viser CDE4 et préparer l'entraîneur mondial.</li>
            <li>SS4 et Boutique3: envisager CDE5 si la structure suit déjà.</li>
            <li>SS5 et Boutique4: le CDE6 devient enfin cohérent avec un projet complet.</li>
          </ul>
        </div>

        <div className="guide-subsection">
          <h4>Ce que cela implique pour le centre de formation</h4>
          <ul className="clean-list">
            <li>Un CDF coûte à la fois en construction et en tirages hebdomadaires.</li>
            <li>Un jeune de 17 ans reste en général meilleur à potentiel qu'un 20 ans, mais encore faut-il pouvoir le former.</li>
            <li>Le tirage perdu de la semaine ne se récupère pas.</li>
            <li>Le guide conseille clairement de ne pas tirer n'importe comment avant un niveau déjà sérieux.</li>
          </ul>
        </div>

        <GuideCallout title="Très important" tone="warning">
          <p>
            Le centre de formation est l'installation la plus fantasmatique pour un débutant,
            mais aussi l'une des moins rentables si le couple CDE/entraîneur ne suit pas.
            Construire trop tôt un CDF, c'est souvent immobiliser de l'argent pour des tirages que tu revendras mal.
          </p>
        </GuideCallout>
      </>
    ),
  },
  {
    id: "plan-progression",
    title: "11. Plan de progression sur 10 semaines",
    kicker: "Feuille de route",
    summary:
      "Une première saison réussie repose sur quelques décisions cohérentes répétées proprement.",
    content: (
      <>
        <GuideTable
          headers={["Période", "Priorité", "Décisions concrètes"]}
          rows={[
            ["Semaine 1", "Diagnostic", "Lire la division, trier le roster, vérifier les profils réellement exploitables."],
            ["Semaines 1 à 3", "Stabilisation", "Lancer les premiers upgrades, entraîner en normal ou tranquille, éviter les dépenses impulsives."],
            ["Semaines 3 à 6", "Optimisation", "Ajuster le groupe de course, vendre les profils sans avenir, rechercher un ou deux renforts utiles."],
            ["Semaines 6 à 10", "Consolidation", "Préparer la saison suivante avec une structure plus forte que ton point de départ."],
          ]}
        />

        <div className="guide-subsection">
          <h4>Ce qu'il faut absolument éviter</h4>
          <ul className="clean-list">
            <li>Monter à plus de 25 coureurs: cela bloque tirages, enchères, inscriptions et entraînement.</li>
            <li>Surpayer des salaires alors que le club n'a pas encore ses revenus structurels.</li>
            <li>Monter les primaires trop tôt et découvrir ensuite un foncier irrécupérable.</li>
            <li>Envoyer les jeunes partout, tout le temps, jusqu'à casser leur forme.</li>
            <li>Penser qu'un CDF compensera à lui seul un retard d'infrastructure.</li>
          </ul>
        </div>

        <GuideCallout title="Philosophie de départ" tone="success">
          <p>
            Un club débutant solide vaut mieux qu'un club spectaculaire mais mal construit.
            Si tes revenus montent, que ton CDE progresse et que tu gardes une masse salariale propre,
            tu prépares déjà les saisons suivantes bien mieux que beaucoup de démarrages trop agressifs.
          </p>
        </GuideCallout>
      </>
    ),
  },
];

const guideHighlights = [
  { label: "Effectif initial", value: "10 coureurs" },
  { label: "Trésorerie", value: "1 000 000 €" },
  { label: "Bonus sponsor", value: "+500 k€ à 10 et 20 semaines" },
  { label: "Priorité réelle", value: "Revenus + CDE avant le reste" },
];

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId);

  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
}

export default function BeginnerGuidePage() {
  return (
    <div className="page-stack">
      <PageTitle
        title="Guide du débutant"
        subtitle="Version longue et structurée pour comprendre les bases du jeu, sécuriser les premières saisons et éviter les erreurs coûteuses."
      />

      <Card>
        <div className="guide-intro">
          <div className="guide-intro-copy">
            <p className="guide-kicker">Version enrichie</p>
            <h3 className="guide-intro-title">Une feuille de route complète pour démarrer proprement sur CyManager</h3>
            <p className="guide-intro-text">
              Cette page reprend les enseignements essentiels du guide source et les réorganise
              en chapitres actionnables: lecture du roster, entraînement, investissements,
              marché des transferts, tactiques et plan de progression. Le but n'est pas de
              promettre une recette miracle, mais d'éviter les erreurs structurelles les plus fréquentes.
            </p>
          </div>

          <div className="guide-highlight-grid">
            {guideHighlights.map((item) => (
              <div key={item.label} className="guide-highlight-card">
                <span className="guide-highlight-label">{item.label}</span>
                <strong className="guide-highlight-value">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="guide-layout">
        <aside className="guide-toc card">
          <h3 className="card-title">Sommaire</h3>
          <nav className="guide-toc-nav">
            {sections.map((section) => (
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
          {sections.map((section) => (
            <Card key={section.id}>
              <section id={section.id} className="guide-section-anchor">
                <header className="guide-section-header">
                  <p className="guide-kicker">{section.kicker}</p>
                  <h3 className="guide-section-title">{section.title}</h3>
                  <p className="guide-section-summary">{section.summary}</p>
                </header>
                {section.content}
              </section>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}