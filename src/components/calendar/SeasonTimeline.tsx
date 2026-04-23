import { useMemo } from "react";
import { getSeasonCycle, WEEKS_PER_SEASON } from "../../lib/calendar/seasonCycle";
import { STATIC_SEASON_EVENTS, WEEKLY_DEADLINES } from "../../lib/calendar/timelineEvents";

type SeasonTimelineProps = {
  title?: string;
  compact?: boolean;
};

function getEventToneClass(tone: "neutral" | "warning" | "danger" | "success"): string {
  if (tone === "warning") {
    return "season-roadmap-event-warning";
  }

  if (tone === "danger") {
    return "season-roadmap-event-danger";
  }

  if (tone === "success") {
    return "season-roadmap-event-success";
  }

  return "season-roadmap-event-neutral";
}

export default function SeasonTimeline({ title = "Timeline de la saison", compact = false }: SeasonTimelineProps) {
  const cycle = useMemo(() => getSeasonCycle(new Date()), []);

  return (
    <section className={compact ? "season-roadmap season-roadmap-compact" : "season-roadmap"} aria-label="Timeline saisonniere">
      <div className="season-roadmap-header">
        <div>
          <h3 className="season-roadmap-title">{title}</h3>
          <p className="muted">Saison {cycle.season} · Semaine {cycle.week}/{WEEKS_PER_SEASON}</p>
        </div>
        <div className="season-roadmap-deadlines" aria-label="Deadlines hebdomadaires">
          {WEEKLY_DEADLINES.map((deadline) => (
            <span key={deadline} className="season-roadmap-deadline-chip">
              {deadline}
            </span>
          ))}
        </div>
      </div>

      <div className="season-roadmap-grid" role="list">
        {STATIC_SEASON_EVENTS.map((event) => {
          const isCurrent = event.week === cycle.week;

          return (
            <article
              key={event.week}
              role="listitem"
              className={isCurrent ? "season-roadmap-week is-current" : "season-roadmap-week"}
            >
              <p className="season-roadmap-week-label">Semaine {event.week}</p>
              <p className={`season-roadmap-event ${getEventToneClass(event.tone)}`}>{event.label}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
