import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PageChrome } from "./PageChrome";
import { CARD_IDS, getCardDefinition, getCardImagePath, getTokenImagePath } from "@/lib/constants";

export const ImagePage = () => {
  const navigate = useNavigate();
  const { cardId = "" } = useParams();

  if (!CARD_IDS.includes(cardId)) {
    return <Navigate to="/home" replace />;
  }

  const card = getCardDefinition(cardId);

  return (
    <PageChrome
      background="board"
      actions={
        <button className="ghost-button" onClick={() => navigate(-1)}>
          Back
        </button>
      }
    >
      <section className="panel strong setup-card stack" style={{ alignItems: "center" }}>
        <h1 className="headline" style={{ textAlign: "center" }}>
          {card.name}
        </h1>
        <img
          src={getCardImagePath(cardId)}
          alt={card.name}
          style={{ width: "min(100%, 420px)", borderRadius: "24px", boxShadow: "var(--shadow)" }}
        />
        <img
          src={getTokenImagePath(cardId)}
          alt={`${card.name} token`}
          style={{ width: "120px", height: "120px", borderRadius: "28px", objectFit: "cover" }}
        />
      </section>
    </PageChrome>
  );
};
