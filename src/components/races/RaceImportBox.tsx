import { useState } from "react";

type RaceImportBoxProps = {
  onAnalyze: (rawText: string) => void;
};

export default function RaceImportBox({ onAnalyze }: RaceImportBoxProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    onAnalyze(value);
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

      <div className="inline-actions">
        <button type="submit" className="button button-primary">
          Analyser la course
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => setValue("")}
        >
          Vider
        </button>
      </div>
    </form>
  );
}