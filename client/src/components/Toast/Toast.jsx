import "./Toast.css";
import { useEffect, useState } from "react";

/**
 * Toast component – displays a brief notification.
 * Props:
 *   message  – string to display
 *   type     – "success" | "error" | "info"
 *   onClose  – callback when toast finishes
 *   duration – ms before auto-dismiss (default 3000)
 */
const Toast = ({ message, type = "success", onClose, duration = 3000 }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 350); // wait for fade-out
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`toast toast-${type} ${visible ? "toast-in" : "toast-out"}`}>
            <span className="toast-icon">
                {type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}
            </span>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 350); }}>
                ×
            </button>
        </div>
    );
};

/**
 * ToastContainer – place once at the root level.
 * Manages a queue of toasts.
 *
 * Usage:
 *   const { showToast, ToastContainer } = useToast();
 *   <ToastContainer />
 *   showToast("Saved!", "success");
 */
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = "success", duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const ToastContainer = () => (
        <div className="toast-container">
            {toasts.map((t) => (
                <Toast
                    key={t.id}
                    message={t.message}
                    type={t.type}
                    duration={t.duration}
                    onClose={() => removeToast(t.id)}
                />
            ))}
        </div>
    );

    return { showToast, ToastContainer };
};

export default Toast;
