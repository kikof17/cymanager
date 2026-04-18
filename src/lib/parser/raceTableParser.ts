// Nouveau parser basé sur un tableau normalisé (voir template)
// Utilisation : import { parseRaceTable } from './raceTableParser';

export type ParsedRaceTable = {
  name: string;
  date: string;
  distanceKm: number;
  elevation: number;
  cols: number;
  cotes: number;
  secteursPlats: boolean;
  secteursVallonnes: boolean;
  secteursMontagneux: boolean;
  arrivee: string;
  terrain: string;
  difficulte: string;
  profil: 'Plaine' | 'Vallon' | 'Montagne' | 'CLM' | 'Pavé' | 'Mixte';
};

export function parseRaceTable(input: string): ParsedRaceTable {
  // Extraction ligne par ligne
  const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const data: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([\wÀ-ÿ\s()]+)\s*\|\s*(.+)$/);
    if (match) {
      data[match[1].toLowerCase().replace(/\s+/g, '')] = match[2].trim();
    }
  }
  // Extraction des champs
  const name = data['nom'] || '';
  const date = data['date'] || '';
  const distanceKm = parseFloat((data['distance(km)'] || '').replace(/[^\d.]/g, '')) || 0;
  const elevation = parseInt((data['dénivelétotal(m)'] || '').replace(/[^\d]/g, '')) || 0;
  const cols = parseInt((data['nombredecols'] || '').replace(/[^\d]/g, '')) || 0;
  const cotes = parseInt((data['nombredecôtes'] || '').replace(/[^\d]/g, '')) || 0;
  const plats = (data['secteursplats'] || '').toLowerCase().includes('oui');
  const vallon = (data['secteursvallonnés'] || '').toLowerCase().includes('oui');
  const montagne = (data['secteursmontagneux'] || '').toLowerCase().includes('oui');
  const arrivee = data['arrivée'] || '';
  const terrain = data['terrain'] || '';
  const difficulte = data['difficulté'] || '';

  // Déduction du profil (priorité au plat si tout est plat, même avec gros D+)
  let profil: ParsedRaceTable['profil'] = 'Mixte';
  if (plats && !montagne && !vallon && cols === 0 && cotes === 0) {
    profil = 'Plaine';
  } else if (montagne || cols > 0 || elevation > 1800) {
    profil = 'Montagne';
  } else if (vallon || cotes > 0 || (elevation > 900 && elevation <= 1800)) {
    profil = 'Vallon';
  }
  // Bonus CLM/Pavé
  if (terrain.toLowerCase().includes('clm') || arrivee.toLowerCase().includes('clm')) {
    profil = 'CLM';
  }
  if (terrain.toLowerCase().includes('pavé') || arrivee.toLowerCase().includes('pavé')) {
    profil = 'Pavé';
  }

  return {
    name,
    date,
    distanceKm,
    elevation,
    cols,
    cotes,
    secteursPlats: plats,
    secteursVallonnes: vallon,
    secteursMontagneux: montagne,
    arrivee,
    terrain,
    difficulte,
    profil,
  };
}
