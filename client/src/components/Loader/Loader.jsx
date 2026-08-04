import "./Loader.css";

/**
 * Loader – full-screen or inline spinner.
 * Props:
 *   fullPage – if true, occupies the full viewport height
 */
const Loader = ({ fullPage = false }) => {
    return (
        <div className={`loader-wrapper ${fullPage ? "loader-fullpage" : ""}`}>
            <div className="loader-spinner"></div>
        </div>
    );
};

export default Loader;
