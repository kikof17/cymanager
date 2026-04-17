import type { Rider } from "../../types/rider";
import type { RiderProfile, RiderProfileSummary } from "../../types/training";

type ProfileScoreMap = Record<RiderProfile, number>;

function computeProfileScores(rider: Rider): ProfileScoreMap {
  return {
    Grimpeur:
      rider.mountain * 3 +
      rider.hill * 2 +
      rider.resistance * 1.5 +
      rider.endurance * 1.2 +
      rider.stageRace * 1 +
      rider.recovery * 0.8,

    Puncheur:
      rider.hill * 3 +
      rider.sprint * 1.5 +
      rider.agility * 1.2 +
      rider.flat * 1 +
      rider.resistance * 1 +
      rider.breakaway * 0.8,

    Rouleur:
      rider.timeTrial * 3 +
      rider.flat * 2 +
      rider.endurance * 1.4 +
      rider.resistance * 1.2 +
      rider.stageRace * 0.8,

    Sprinteur:
      rider.sprint * 3 +
      rider.flat * 1.7 +
      rider.agility * 1.2 +
      rider.endurance * 0.7,

    Flandrien:
      rider.cobble * 3 +
      rider.flat * 1.5 +
      rider.hill * 1.4 +
      rider.resistance * 1.2 +
      rider.breakaway * 1 +
      rider.agility * 0.7,

    "Coureur de classement":
      rider.stageRace * 3 +
      rider.recovery * 2 +
      rider.mountain * 1.8 +
      rider.timeTrial * 1.5 +
      rider.endurance * 1.2 +
      rider.resistance * 1.2,

    Baroudeur:
      rider.breakaway * 3 +
      rider.hill * 1.5 +
      rider.flat * 1.2 +
      rider.endurance * 1.1 +
      rider.agility * 1,

    Polyvalent:
      rider.total +
      rider.endurance +
      rider.resistance +
      rider.recovery +
      rider.experience * 0.5,

    "Équipier en formation":
      (100 - rider.ageYears) * 0.5 +
      rider.total +
      rider.endurance +
      rider.resistance,
  };
}

function getTopProfiles(scores: ProfileScoreMap): {
  primaryProfile: RiderProfile;
  secondaryProfile: RiderProfile;
} {
  const sorted = (Object.entries(scores) as Array<[RiderProfile, number]>).sort(
    (a, b) => b[1] - a[1]
  );

  return {
    primaryProfile: sorted[0][0],
    secondaryProfile: sorted[1][0],
  };
}

function getStrengths(rider: Rider): string[] {
  const stats = [
    { label: "Montagne", value: rider.mountain },
    { label: "Vallon", value: rider.hill },
    { label: "Plaine", value: rider.flat },
    { label: "Sprint", value: rider.sprint },
    { label: "Pavé", value: rider.cobble },
    { label: "CLM", value: rider.timeTrial },
    { label: "CAE", value: rider.stageRace },
    { label: "Récupération", value: rider.recovery },
    { label: "Endurance", value: rider.endurance },
    { label: "Résistance", value: rider.resistance },
    { label: "Baroudeur", value: rider.breakaway },
  ];

  return stats
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => `${item.label} ${item.value}`);
}

function getWeaknesses(rider: Rider): string[] {
  const stats = [
    { label: "Montagne", value: rider.mountain },
    { label: "Vallon", value: rider.hill },
    { label: "Plaine", value: rider.flat },
    { label: "Sprint", value: rider.sprint },
    { label: "Pavé", value: rider.cobble },
    { label: "CLM", value: rider.timeTrial },
    { label: "CAE", value: rider.stageRace },
    { label: "Récupération", value: rider.recovery },
    { label: "Endurance", value: rider.endurance },
    { label: "Résistance", value: rider.resistance },
    { label: "Baroudeur", value: rider.breakaway },
  ];

  return stats
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((item) => `${item.label} ${item.value}`);
}

export function buildRiderProfileSummary(rider: Rider): RiderProfileSummary {
  const scores = computeProfileScores(rider);
  const { primaryProfile, secondaryProfile } = getTopProfiles(scores);

  return {
    riderId: rider.id,
    primaryProfile,
    secondaryProfile,
    strengths: getStrengths(rider),
    weaknesses: getWeaknesses(rider),
  };
}

export function buildRiderProfiles(riders: Rider[]): RiderProfileSummary[] {
  return riders.map(buildRiderProfileSummary);
}