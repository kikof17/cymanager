import Card from "../common/Card";
import type { Rider } from "../../types/rider";
import type { RiderProfileSummary } from "../../types/training";

type RiderCardProps = {
  rider: Rider;
  profile?: RiderProfileSummary;
};

export default function RiderCard({ rider, profile }: RiderCardProps) {
  return (
    <Card title={rider.name}>
      <div className="profile-card-lines">
        <p>
          <strong>Profil principal :</strong>{" "}
          {profile ? profile.primaryProfile : "Non calculé"}
        </p>
        <p>
          <strong>Profil secondaire :</strong>{" "}
          {profile ? profile.secondaryProfile : "Non calculé"}
        </p>
        <p>
          <strong>Forces :</strong>{" "}
          {profile ? profile.strengths.join(" · ") : "—"}
        </p>
        <p>
          <strong>Faiblesses :</strong>{" "}
          {profile ? profile.weaknesses.join(" · ") : "—"}
        </p>
      </div>
    </Card>
  );
}