import "./EmptyState.css";
import { useNavigate } from "react-router-dom";

/**
 * EmptyState – reusable component for empty lists/pages.
 * Props:
 *   icon    – emoji or text icon (default "◇")
 *   title   – heading text
 *   message – subtext
 *   cta     – label for the action button
 *   ctaPath – route to navigate to on CTA click
 */
const EmptyState = ({
    icon = null,
    title = "Nothing here yet",
    message = "",
    cta = "",
    ctaPath = "/",
}) => {
    const navigate = useNavigate();

    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h2 className="empty-state-title">{title}</h2>
            {message && <p className="empty-state-message">{message}</p>}
            {cta && (
                <button
                    className="empty-state-btn"
                    onClick={() => navigate(ctaPath)}
                >
                    {cta}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
