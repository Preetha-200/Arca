import "./Footer.css";
import { useNavigate } from "react-router-dom";

const Footer = () => {
    const navigate = useNavigate();

    return (
        <footer className="footer">
            <div className="footer-inner">
                {/* Brand */}
                <div className="footer-brand">
                    <div className="footer-logo" onClick={() => navigate("/")}>
                        <img src="/logo-1.png" alt="ARCA logo" />
                        <span>ARCA</span>
                    </div>
                    <p className="footer-tagline">Designed for the Exceptional</p>
                </div>

                {/* Navigation */}
                <div className="footer-links">
                    <h4>Explore</h4>
                    <ul>
                        <li onClick={() => navigate("/")}>Home</li>
                        <li onClick={() => navigate("/about")}>About</li>
                        <li onClick={() => navigate("/products/living-room")}>Living Rooms</li>
                        <li onClick={() => navigate("/products/bedroom")}>Bedrooms</li>
                        <li onClick={() => navigate("/products/kitchen")}>Kitchens</li>
                        <li onClick={() => navigate("/products/bathroom")}>Bathrooms</li>
                        <li onClick={() => navigate("/products/dining-room")}>Dining Areas</li>
                        <li onClick={() => navigate("/products/home-office")}>Home Office</li>
                    </ul>
                </div>

                {/* Account */}
                <div className="footer-links">
                    <h4>Account</h4>
                    <ul>
                        <li onClick={() => navigate("/account")}>My Profile</li>
                        <li onClick={() => navigate("/wishlist")}>Wishlist</li>
                        <li onClick={() => navigate("/bookings")}>My Bookings</li>
                        <li onClick={() => navigate("/orders")}>My Orders</li>
                    </ul>
                </div>

                {/* Contact */}
                <div className="footer-links">
                    <h4>Contact</h4>
                    <ul>
                        <li>Chennai, Tamil Nadu</li>
                        <li>support@arca.in</li>
                        <li>+91 98765 43210</li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} ARCA Interior Design. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
