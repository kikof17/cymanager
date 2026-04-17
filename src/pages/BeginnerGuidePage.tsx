import { useMemo } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";

type GuideSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export default function BeginnerGuidePage() {
  const sections = useMemo<GuideSection[]>(
    () => [
      {
        id: "bien-demarrer",
        title: "1. Bien démarrer son club",
        content: (
          <>
            <p>
              Quand tu crées ton équipe, tu pars avec une base simple : un effectif de
              départ, des installations de niveau 1, un entraîneur cantonal, des vélos
              basiques et une première trésorerie. L’idée au départ n’est pas de tout
              faire, mais d’éviter les grosses erreurs.
            </p>

            <div className="guide-callout guide-callout-info">
              <strong>À retenir</strong>
              <ul className="clean-list">
                <li>Ne te disperse pas dès les premières semaines.</li>
                <li>Commence par comprendre ton effectif avant d’investir.</li>
                <li>Regarde ta division avant de décider quoi entraîner.</li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: "division",
        title: "2. Lire sa division avant de décider",
        content: (
          <>
            <p>
              Avant de toucher à l’entraînement, il faut situer ton équipe dans sa
              division. Le bon réflexe est de comparer les valeurs, les salaires, les
              notes et les catégories de tes coureurs avec celles de la concurrence.
            </p>

            <p>
              Le but n’est pas juste de savoir si ton équipe est forte ou faible. Le but
              est de comprendre où sont tes forces, tes trous et si tu dois viser une
              logique de formation, de maintien ou de progression.
            </p>

            <div className="guide-callout guide-callout-warning">
              <strong>Erreur classique</strong>
              <p>
                Entraîner sans regarder la division. Tu peux très bien monter une
                primaire qui a l’air belle sur le papier mais qui ne correspond ni à ton
                niveau réel ni à ce que demande ta concurrence.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "caracteristiques",
        title: "3. Comprendre les caractéristiques",
        content: (
          <>
            <p>
              Les caractéristiques se divisent en deux familles. Les primaires sont
              celles qu’on veut faire performer directement. Les secondaires soutiennent
              la performance et structurent le coureur sur la durée.
            </p>

            <div className="guide-two-cols">
              <div className="guide-callout">
                <strong>Primaires</strong>
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
                <strong>Secondaires</strong>
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
              L’expérience monte surtout avec la participation aux courses. Elle ne
              s’entraîne pas comme une caractéristique classique.
            </p>
          </>
        ),
      },
      {
        id: "foncier",
        title: "4. Le foncier : la base de tout",
        content: (
          <>
            <p>
              Le foncier d’un coureur est déterminé par l’endurance, la résistance et la
              récupération. C’est une notion centrale, parce qu’il intervient sur toutes
              les courses.
            </p>

            <p>
              Un débutant a souvent tendance à regarder d’abord les primaires, alors que
              le vrai socle d’un bon coureur passe par un foncier solide. Un coureur
              déséquilibré, avec une primaire trop haute et un foncier trop faible,
              coûte vite cher et performe moins bien qu’espéré.
            </p>

            <div className="guide-callout guide-callout-success">
              <strong>Bonne logique</strong>
              <p>
                Chez un jeune, surtout U21, on sécurise d’abord la base si le foncier est
                insuffisant. La primaire vient ensuite.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "profils-course",
        title: "5. Ce qui compte selon le type de course",
        content: (
          <>
            <p>Chaque type de course valorise un noyau de caractéristiques différent.</p>

            <div className="guide-callout">
              <ul className="clean-list">
                <li>
                  <strong>Plaine :</strong> plaine, endurance, sprint
                </li>
                <li>
                  <strong>Vallon :</strong> vallon, résistance, sprint
                </li>
                <li>
                  <strong>Montagne :</strong> montagne, descente, récupération
                </li>
                <li>
                  <strong>CLM :</strong> CLM, résistance, récupération
                </li>
                <li>
                  <strong>Pavé :</strong> pavé, résistance, sprint
                </li>
              </ul>
            </div>

            <p>
              Le baroudeur aide en plaine, vallon et pavé, et augmente aussi la capacité
              à prendre les échappées. Le CAE améliore le comportement d’un coureur sur
              les courses à étapes.
            </p>
          </>
        ),
      },
      {
        id: "tirage-initial",
        title: "6. Analyser son tirage initial",
        content: (
          <>
            <p>
              Ton tirage initial n’est pas là pour te donner une équipe parfaite. Il sert
              surtout à te donner une base de travail. Il faut rapidement identifier :
            </p>

            <ul className="clean-list">
              <li>les coureurs à garder comme base sérieuse,</li>
              <li>les jeunes à développer,</li>
              <li>les profils peu intéressants à moyen terme,</li>
              <li>les coureurs trop chers pour ce qu’ils apportent.</li>
            </ul>

            <p>
              Pour un débutant, un bon coureur est souvent un coureur relativement sain,
              avec des primaires correctes et surtout un foncier déjà exploitable.
            </p>
          </>
        ),
      },
      {
        id: "entrainement",
        title: "7. Entraînement : la bonne logique",
        content: (
          <>
            <p>
              Le raisonnement le plus sain part du coureur, pas du groupe. Pour chaque
              coureur, il faut se demander :
            </p>

            <ul className="clean-list">
              <li>son foncier est-il assez haut pour son niveau ?</li>
              <li>sa primaire dominante vaut-elle déjà le coup d’être poussée ?</li>
              <li>le salaire va-t-il grimper trop vite ?</li>
            </ul>

            <p>
              Ensuite seulement, on cherche les trois entraînements communs qui couvrent
              le plus possible les besoins individuels de l’effectif.
            </p>

            <div className="guide-callout guide-callout-warning">
              <strong>Erreur classique</strong>
              <p>
                Monter trop tôt les primaires d’un jeune et se retrouver avec un coureur
                encore creux, déjà plus cher, et pas vraiment dominant en course.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "transferts",
        title: "8. Marché des transferts",
        content: (
          <>
            <p>
              Au début, tu n’as pas besoin de faire n’importe quoi sur le marché. Le bon
              réflexe est d’acheter avec une idée claire :
            </p>

            <ul className="clean-list">
              <li>renforcer un profil manquant,</li>
              <li>remplacer un coureur trop faible,</li>
              <li>ou former intelligemment sans exploser la masse salariale.</li>
            </ul>

            <p>
              Vendre peut aussi être sain si un coureur n’entre pas dans ta logique de
              progression ou s’il coûte trop cher pour son rendement réel.
            </p>
          </>
        ),
      },
      {
        id: "courses",
        title: "9. Inscriptions aux courses",
        content: (
          <>
            <p>
              Une bonne inscription ne consiste pas seulement à prendre les 7 meilleures
              notes globales. Il faut tenir compte du profil de la course, du rôle des
              coureurs et de la cohérence de l’équipe.
            </p>

            <ul className="clean-list">
              <li>un leader pour la perf cible,</li>
              <li>des équipiers utiles au profil,</li>
              <li>un ou deux électrons libres si le contexte s’y prête.</li>
            </ul>

            <p>
              Les réglages de course doivent rester cohérents avec le rôle, le profil de
              la course et la forme du coureur.
            </p>
          </>
        ),
      },
      {
        id: "installations",
        title: "10. Installations : progresser proprement",
        content: (
          <>
            <p>
              Les installations doivent être pensées comme un investissement de moyen
              terme. Monter trop vite n’importe quoi n’a pas beaucoup de sens. Il faut
              les relier à ton projet :
            </p>

            <ul className="clean-list">
              <li>former mieux,</li>
              <li>mieux gérer ton club,</li>
              <li>préparer la suite des saisons.</li>
            </ul>

            <p>
              Le centre d’entraînement et le centre de formation prennent évidemment une
              importance forte si tu veux bâtir un club structuré sur la durée.
            </p>
          </>
        ),
      },
      {
        id: "plan-progression",
        title: "11. Plan simple pour les premières semaines",
        content: (
          <>
            <ol className="compact-list">
              <li>Comparer ton effectif à ta division.</li>
              <li>Identifier les jeunes à garder et les profils faibles.</li>
              <li>Sécuriser le foncier des coureurs à potentiel.</li>
              <li>Éviter de faire gonfler les salaires trop tôt.</li>
              <li>Choisir les courses avec une logique simple et propre.</li>
              <li>Planifier les installations au lieu d’improviser.</li>
            </ol>

            <div className="guide-callout guide-callout-success">
              <strong>Règle simple</strong>
              <p>
                Au début, un club solide vaut mieux qu’un club spectaculaire mais mal
                construit.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "erreurs",
        title: "12. Erreurs classiques à éviter",
        content: (
          <>
            <ul className="clean-list">
              <li>négliger le foncier,</li>
              <li>monter les primaires trop vite,</li>
              <li>se focaliser uniquement sur la note globale,</li>
              <li>ignorer sa division,</li>
              <li>acheter sans logique sportive,</li>
              <li>laisser grimper la masse salariale trop tôt,</li>
              <li>former sans plan à moyen terme.</li>
            </ul>
          </>
        ),
      },
    ],
    []
  );

  return (
    <div className="page-stack">
      <PageTitle
        title="Guide du débutant"
        subtitle="Version structurée pour comprendre le jeu, éviter les erreurs de départ et utiliser l'outil intelligemment."
      />

      <div className="guide-layout">
        <aside className="guide-toc card">
          <h3 className="card-title">Sommaire</h3>
          <nav className="guide-toc-nav">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="guide-toc-link">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="guide-content">
          {sections.map((section) => (
            <Card key={section.id} title={section.title}>
              <section id={section.id} className="guide-section-anchor">
                {section.content}
              </section>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}