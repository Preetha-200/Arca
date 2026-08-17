import sys

new_code = '''import "./index.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db, storage } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection, addDoc, doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import API_BASE from "../../api";
import { getProductById } from "../../data/products";

const CONSULTATION_TYPES = [
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Dining Room",
    "Home Office",
    "Bathroom",
    "Full Home",
    "Other"
];

const fetchUserProfile = async (uid) => {
    try {
        const refDoc = doc(db, "users", uid);
        const snap = await getDoc(refDoc);
        if (snap.exists()) return snap.data();
    } catch (err) {
        console.warn("fetchUserProfile error:", err);
    }
    return null;
};

const upsertUserProfile = async (uid, data) => {
    try {
        await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
        console.warn("upsertUserProfile error:", err);
    }
};

const Index = () => {
    const navigate       = useNavigate();
    const [searchParams] = useSearchParams();
    const consultancyRef = useRef(null);

    const [user,             setUser]             = useState(null);

    /* -- Form fields -- */
    const [name,             setName]             = useState("");
    const [email,            setEmail]            = useState("");
    const [mobile,           setMobile]           = useState("");
    const [city,             setCity]             = useState("");
    const [consultationType, setConsultationType] = useState("");

    // Task 5 New Fields
    const [projectType,      setProjectType]      = useState("");
    const [propertyType,     setPropertyType]     = useState("");
    const [dimensionsLength, setDimensionsLength] = useState("");
    const [dimensionsWidth,  setDimensionsWidth]  = useState("");
    const [dimensionsUnit,   setDimensionsUnit]   = useState("feet");
    const [ceilingHeight,    setCeilingHeight]    = useState("");
    
    const [interiorStyle,    setInteriorStyle]    = useState("");
    const [preferredTheme,   setPreferredTheme]   = useState("");
    const [description,      setDescription]      = useState("");
    
    const [budget,           setBudget]           = useState("");
    const [preferredDate,    setPreferredDate]    = useState("");
    const [preferredTime,    setPreferredTime]    = useState("");

    const [productId,        setProductId]        = useState("");
    const [productName,      setProductName]      = useState("");

    const [referenceImages,  setReferenceImages]  = useState([]);
    const [imagePreviews,    setImagePreviews]    = useState([]);

    /* -- UI state -- */
    const [loading,          setLoading]          = useState(false);
    const [showPopup,        setShowPopup]        = useState(false);
    const [bookingId,        setBookingId]        = useState("");

    /* -- Guest-only OTP state -- */
    const [otp,              setOtp]              = useState("");
    const [otpSent,          setOtpSent]          = useState(false);
    const [verified,         setVerified]         = useState(false);
    const [otpClicked,       setOtpClicked]       = useState(false);

    /* -- Validation errors -- */
    const [nameError,        setNameError]        = useState("");
    const [emailError,       setEmailError]       = useState("");
    const [mobileError,      setMobileError]      = useState("");

    const [mobilePrefilled,  setMobilePrefilled]  = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setName(currentUser.displayName || "");
                setEmail(currentUser.email || "");
                setVerified(true);
                setOtp("");
                setOtpSent(false);
                setOtpClicked(true);

                const profile = await fetchUserProfile(currentUser.uid);
                const savedMobile = profile?.mobile || localStorage.getItem("userMobile") || "";
                setMobile(savedMobile);
                if (savedMobile) setMobilePrefilled(true);
            } else {
                setName("");
                setEmail("");
                setMobile("");
                setMobilePrefilled(false);
                setVerified(false);
                setOtp("");
                setOtpSent(false);
                setOtpClicked(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const roomParam    = searchParams.get("room");
        const prodId       = searchParams.get("product_id");
        const scrollToForm = searchParams.get("consultancy") === "true";

        if (prodId) {
            const prod = getProductById(prodId);
            if (prod) {
                setProductId(prod.id);
                setProductName(prod.title);
                if (prod.roomType) setConsultationType(prod.roomType);
            }
        } else if (roomParam) {
            const decoded = decodeURIComponent(roomParam);
            const matched = CONSULTATION_TYPES.find(
                (t) => t.toLowerCase() === decoded.toLowerCase()
            );
            if (matched) setConsultationType(matched);
        }

        if (scrollToForm) {
            setTimeout(() => {
                consultancyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }, [searchParams]);

    const sendOtp = async () => {
        try {
            const res  = await fetch(\\/send-otp\, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setOtpSent(true);
                setOtpClicked(true);
                alert("OTP sent to your email");
            } else {
                alert(data.message);
            }
        } catch {
            alert("Failed to send OTP. Please check your connection.");
        }
    };

    const verifyOtp = async () => {
        try {
            const res  = await fetch(\\/verify-otp\, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (data.verified) {
                setVerified(true);
                alert("Email verified successfully");
            } else {
                alert(data.message || "Invalid OTP");
            }
        } catch {
            alert("OTP verification failed. Please try again.");
        }
    };

    const validateName = (value) => {
        const trimmed   = value.trim();
        const fakeNames = ["abc", "xyz", "test", "name", "user", "dummy", "asdf"];
        if (trimmed.length < 3)                        return "Name must be at least 3 characters";
        if (!/^[A-Za-z ]+$/.test(trimmed))            return "Only letters and spaces allowed";
        if (fakeNames.includes(trimmed.toLowerCase())) return "Please enter a valid name";
        return "";
    };

    const validateEmail = (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Please enter a valid email";
        return "";
    };

    const validateMobile = (value) => {
        if (!/^[6-9]\d{9}$/.test(value)) return "Enter a valid 10-digit mobile number";
        return "";
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(f => f.type.startsWith("image/") && f.size < 5 * 1024 * 1024);
        
        if (validFiles.length < files.length) {
            alert("Some files were rejected. Only images under 5MB are allowed.");
        }

        setReferenceImages(prev => [...prev, ...validFiles]);
        
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        const urls = [];
        for (const file of referenceImages) {
            const storageRef = ref(storage, \ookings/\_\\);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            urls.push(url);
        }
        return urls;
    };

    const handleBookConsultancy = async () => {
        setLoading(true);

        try {
            const currentUser = auth.currentUser;
            const isLoggedIn  = !!currentUser;

            let uploadedImageUrls = [];
            if (referenceImages.length > 0) {
                try {
                    uploadedImageUrls = await uploadImages();
                } catch (imgErr) {
                    console.error("Image upload failed", imgErr);
                    alert("Failed to upload images. Proceeding without them.");
                }
            }

            const dimensions = (dimensionsLength && dimensionsWidth) 
                ? \\ x \ \\ 
                : "";

            const response = await fetch(\\/book-consultancy\, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    name, email, mobile, city, consultationType,
                    firebaseAuthenticated: isLoggedIn,
                    userId: currentUser?.uid || null,
                    projectType, propertyType, spaceType: consultationType,
                    dimensions, ceilingHeight, budget, interiorStyle,
                    preferredTheme, description, preferredDate, preferredTime,
                    productId, productName, referenceImages: uploadedImageUrls
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const { booking } = data;

                if (isLoggedIn) {
                    await upsertUserProfile(currentUser.uid, {
                        name, email, mobile, photoURL: currentUser.photoURL || "",
                    });
                    if (mobile) localStorage.setItem("userMobile", mobile);

                    try {
                        await addDoc(
                            collection(db, "consultancies", currentUser.uid, "bookings"),
                            {
                                userId:               currentUser.uid,
                                name, email, mobile, city,
                                consultationType:     booking?.consultationType || consultationType || "Interior Design",
                                bookingId:            booking?.bookingId            || "",
                                bookingDate:          new Date().toISOString(),
                                scheduledDate:        booking?.scheduledDate        || "",
                                scheduledDateDisplay: booking?.scheduledDateDisplay || "",
                                scheduledTime:        booking?.scheduledTime        || "",
                                designerName:         booking?.designerName         || "",
                                meetingUrl:           booking?.meetingUrl            || "",
                                duration:             booking?.duration              || "60 minutes",
                                meetingType:          booking?.meetingType           || "Google Meet (Virtual)",
                                status:               booking?.status                || "Confirmed",
                                createdAt:            serverTimestamp(),
                            }
                        );
                    } catch (fsErr) {
                        console.warn("Firestore save failed:", fsErr);
                    }
                }

                setBookingId(booking?.bookingId || "");
                setShowPopup(true);

                /* -- Reset form -- */
                setCity(""); setConsultationType(""); setOtp(""); setOtpSent(false);
                setProjectType(""); setPropertyType(""); setDimensionsLength("");
                setDimensionsWidth(""); setCeilingHeight(""); setBudget("");
                setInteriorStyle(""); setPreferredTheme(""); setDescription("");
                setPreferredDate(""); setPreferredTime(""); setProductId("");
                setProductName(""); setReferenceImages([]); setImagePreviews([]);

                if (!isLoggedIn) {
                    setName(""); setEmail(""); setMobile(""); setVerified(false);
                }
            } else {
                alert(data.message || "Booking failed. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("Booking failed. Please try again.");
        }
        setLoading(false);
    };

    const isButtonDisabled = () => {
        const baseFieldsMissing =
            !name || !email || !mobile || !city || !projectType || !propertyType || 
            !consultationType || !budget || !interiorStyle || !preferredDate || 
            !preferredTime || !!nameError || !!emailError || !!mobileError || loading;

        if (user) return baseFieldsMissing;
        return baseFieldsMissing || !verified;
    };

    // Get today's date in YYYY-MM-DD for date picker min attribute
    const today = new Date().toISOString().split("T")[0];

    return (
        <div className="home">
            <Navbar />

            {/* ------------ HERO ------------ */}
            <section className="hero">
                <div className="hero-overlay" />
                <img src="/logo.png" alt="logo" />
                <h1>ARCA</h1>
                <h2>Designed for the Exceptional</h2>
                <button
                    className="hero-btn"
                    onClick={() => document.getElementById("designs").scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                    View designs
                </button>
            </section>

            {/* ------------ DESIGNS ------------ */}
            <section className="designs">
                <div className="h2" id="designs">
                    <p>OUR DESIGNS</p>
                </div>

                <div className="grid">
                    <div onClick={() => navigate("/products/living-room")}>
                        <img src="/livingRoom.png" alt="Living Room" />
                        <p>Living Rooms</p>
                    </div>
                    <div onClick={() => navigate("/products/kitchen")}>
                        <img src="/kitchen.png" alt="Kitchen" />
                        <p>Kitchens</p>
                    </div>
                    <div onClick={() => navigate("/products/dining-room")}>
                        <img src="/dining.png" alt="Dining" />
                        <p>Dining Area</p>
                    </div>
                    <div onClick={() => navigate("/products/home-office")}>
                        <img src="/homeOffice.png" alt="Office" />
                        <p>Home Office</p>
                    </div>
                    <div onClick={() => navigate("/products/bedroom")}>
                        <img src="/bedroom.png" alt="Bedroom" />
                        <p>Bedrooms</p>
                    </div>
                    <div onClick={() => navigate("/products/bathroom")}>
                        <img src="/bathroom.png" alt="Bathroom" />
                        <p>Bathrooms</p>
                    </div>
                </div>
            </section>

            {/* ------------ CONSULTANCY ------------ */}
            <section className="consultancy" ref={consultancyRef} id="consultancy-form">
                <div className="text">
                    <h2>Your vision, architecturally defined.</h2>
                    <p>Skip the confusion of layouts and costs. Our 3D design sessions allow you to walk through your future home before construction.</p>
                </div>

                <div className="form">
                    <h3>Meet a designer</h3>

                    {productId && productName && (
                        <div className="prefilled-product-banner">
                            <span className="material-symbols-outlined">chair</span>
                            <span>Consulting for: <strong>{productName}</strong></span>
                        </div>
                    )}

                    {user && user.photoURL && (
                        <div className="user-greeting">
                            <img src={user.photoURL} alt={user.displayName || "Profile"} className="user-greeting-avatar" referrerPolicy="no-referrer" />
                            <span className="user-greeting-name">Hello, {user.displayName?.split(" ")[0] || "there"}</span>
                        </div>
                    )}

                    <div className="form-section">
                        <h4 className="form-section-title">Personal Information</h4>
                        <input type="text" placeholder="Enter your Name" value={name} disabled={!!user} onChange={(e) => { setName(e.target.value); setNameError(validateName(e.target.value)); }} />
                        {nameError && <p className="error-text">{nameError}</p>}

                        <div className="email-input-wrapper">
                            <input type="email" placeholder="Enter your Email" value={email} disabled={!!user} onChange={(e) => { setEmail(e.target.value); setEmailError(validateEmail(e.target.value)); setOtpClicked(false); if (verified) { setVerified(false); setOtp(""); setOtpSent(false); } }} />
                            {!user && !verified && ( <button type="button" className="send-otp-btn" onClick={sendOtp}>{otpSent ? "Resend" : "Send OTP"}</button> )}
                            {user && <span className="email-verified-tick" title="Verified via Firebase"><span className="material-symbols-outlined" style={{fontSize:"18px",color:"#2e7d32"}}>verified</span></span>}
                        </div>
                        {!user && emailError && <p className="error-text">{emailError}</p>}
                        {!user && email && !emailError && !verified && !otpClicked && <p className="error-text">Please verify your email</p>}

                        {!user && otpSent && !verified && (
                            <div className="otp-input-wrapper">
                                <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                                <button type="button" className="verify-otp" onClick={verifyOtp}>Verify</button>
                            </div>
                        )}

                        <div className="mobile-input">
                            <div className="country-code"><span>+91</span></div>
                            <input type="text" placeholder="Enter your Mobile number" value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setMobileError(validateMobile(e.target.value.replace(/\D/g, "").slice(0, 10))); }} />
                        </div>
                        {mobileError && <p className="error-text">{mobileError}</p>}
                        {user && mobilePrefilled && !mobileError && <p className="info-text">Mobile number pre-filled from your profile — edit if needed.</p>}

                        <select value={city} onChange={(e) => setCity(e.target.value)}>
                            <option value="">Select your property city</option>
                            <option>Chennai</option><option>Madurai</option><option>Coimbatore</option><option>Bangalore</option>
                        </select>
                    </div>

                    <div className="form-section">
                        <h4 className="form-section-title">Project Details</h4>
                        <select value={projectType} onChange={e => setProjectType(e.target.value)}>
                            <option value="">Project Type</option>
                            <option value="New Interior">New Interior</option>
                            <option value="Renovation">Renovation</option>
                        </select>
                        <select value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                            <option value="">Property Type</option>
                            <option value="Apartment">Apartment</option>
                            <option value="Independent House">Independent House</option>
                            <option value="Villa">Villa</option>
                            <option value="Office">Office</option>
                            <option value="Other">Other</option>
                        </select>
                        <select value={consultationType} onChange={(e) => setConsultationType(e.target.value)}>
                            <option value="">Room / Space to design</option>
                            {CONSULTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="form-section">
                        <h4 className="form-section-title">Approximate Dimensions</h4>
                        <div className="dimensions-row">
                            <input type="number" placeholder="Length" value={dimensionsLength} onChange={e => setDimensionsLength(e.target.value)} />
                            <span className="dimension-x">×</span>
                            <input type="number" placeholder="Width" value={dimensionsWidth} onChange={e => setDimensionsWidth(e.target.value)} />
                            <select value={dimensionsUnit} onChange={e => setDimensionsUnit(e.target.value)} className="dimension-unit">
                                <option value="feet">feet</option>
                                <option value="metres">metres</option>
                            </select>
                        </div>
                        <input type="text" placeholder="Ceiling height (optional)" value={ceilingHeight} onChange={e => setCeilingHeight(e.target.value)} />
                    </div>

                    <div className="form-section">
                        <h4 className="form-section-title">Design Preferences</h4>
                        <select value={interiorStyle} onChange={e => setInteriorStyle(e.target.value)}>
                            <option value="">Preferred Interior Style</option>
                            <option value="Modern">Modern</option>
                            <option value="Contemporary">Contemporary</option>
                            <option value="Minimalist">Minimalist</option>
                            <option value="Traditional">Traditional</option>
                            <option value="Luxury">Luxury</option>
                            <option value="Scandinavian">Scandinavian</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Other">Other</option>
                        </select>
                        <input type="text" placeholder="Preferred colour / theme (optional)" value={preferredTheme} onChange={e => setPreferredTheme(e.target.value)} />
                        <textarea placeholder="Additional requirements / description" value={description} onChange={e => setDescription(e.target.value)} rows="3" className="textarea-input"></textarea>
                    </div>

                    <div className="form-section">
                        <h4 className="form-section-title">Budget</h4>
                        <select value={budget} onChange={e => setBudget(e.target.value)}>
                            <option value="">Select Budget Range</option>
                            <option value="Under ?5 Lakhs">Under ?5 Lakhs</option>
                            <option value="?5–10 Lakhs">?5–10 Lakhs</option>
                            <option value="?10–20 Lakhs">?10–20 Lakhs</option>
                            <option value="?20–40 Lakhs">?20–40 Lakhs</option>
                            <option value="?40 Lakhs+">?40 Lakhs+</option>
                            <option value="Not decided yet">Not decided yet</option>
                        </select>
                    </div>

                    <div className="form-section">
                        <h4 className="form-section-title">Consultation Preference</h4>
                        <div className="datetime-row">
                            <input type="date" value={preferredDate} min={today} onChange={e => setPreferredDate(e.target.value)} />
                            <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)}>
                                <option value="">Preferred Time Range</option>
                                <option value="Morning">Morning</option>
                                <option value="Afternoon">Afternoon</option>
                                <option value="Evening">Evening</option>
                                <option value="No preference">No preference</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4 className="form-section-title">Reference Images (Optional)</h4>
                        <div className="file-upload-wrapper">
                            <label className="file-upload-btn">
                                <span className="material-symbols-outlined">upload_file</span>
                                <span>Upload Images</span>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{display: 'none'}} />
                            </label>
                        </div>
                        {imagePreviews.length > 0 && (
                            <div className="image-previews">
                                {imagePreviews.map((url, i) => (
                                    <div key={i} className="preview-container">
                                        <img src={url} alt="preview" />
                                        <button className="remove-preview" onClick={() => removeImage(i)}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="booking-btn" onClick={handleBookConsultancy} disabled={isButtonDisabled()}>
                        {loading ? "Booking..." : "Book Consultancy"}
                    </button>
                </div>
            </section>

            {/* ------------ SUCCESS POPUP ------------ */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-box">
                        <h2>Consultation Requested!</h2>
                        <p>
                            Your request has been submitted.
                            <br />
                            {bookingId && (
                                <>
                                    Booking ID: <strong>{bookingId}</strong>
                                    <br />
                                </>
                            )}
                            Our team will confirm the exact date and time shortly.
                        </p>
                        {auth.currentUser && (
                            <button className="pop-up-btn" style={{ marginBottom: "8px" }} onClick={() => { setShowPopup(false); navigate("/bookings"); }}>
                                View My Bookings
                            </button>
                        )}
                        <button className="pop-up-btn" onClick={() => setShowPopup(false)}>
                            Okay
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Index;
'''

with open('index.jsx', 'w', encoding='utf-8') as f:
    f.write(new_code)
