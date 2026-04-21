import { useState } from "react";
import type { RaceImportMode } from "../../lib/utils/stageRaces";

type RaceImportBoxProps = {
  onAnalyze: (rawText: string, mode: RaceImportMode, tourLabel: string) => void;
};

export default function RaceImportBox({ onAnalyze }: RaceImportBoxProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<RaceImportMode>("auto");
  const [tourLabel, setTourLabel] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    onAnalyze(value, mode, tourLabel);
  }

  return (
    <form className="roster-import-form" onSubmit={handleSubmit}>
      <label htmlFor="race-import" className="field-label">
        Colle ici le profil de la course
      </label>

      <textarea
        id="race-import"
        className="textarea"
        rows={12}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Nom de course, type, distance, éléments de profil..."
      />

      <div className="field-grid">
        <div>
          <label htmlFor="race-import-mode" className="field-label">
            Type d'import
          </label>
          <select
            id="race-import-mode"
            className="input select-input"
            value={mode}
            onChange={(event) => setMode(event.target.value as RaceImportMode)}
          >
            <option value="auto">Détection automatique</option>
            <option value="simple">Course simple</option>
            <option value="etapes">Course à étapes</option>
          </select>
        </div>

        <div>
          <label htmlFor="race-import-tour-label" className="field-label">
            Référence du tour
          </label>
          <input
            id="race-import-tour-label"
            className="input"
            type="text"
            value={tourLabel}
            onChange={(event) => setTourLabel(event.target.value)}
            placeholder="Optionnel, mais recommandé pour un import en plusieurs fois"
          />
        </div>
      </div>

      <div className="inline-actions">
        <button type="submit" className="button button-primary">
          Analyser la course
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setValue("");
            setMode("auto");
            setTourLabel("");
          }}
        >
          Vider
        </button>
      </div>
    </form>
  );
}