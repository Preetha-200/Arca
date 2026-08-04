import "./about.css";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

/* ────────────────────────────────────────────────────────────────── */
/*  ANIMATED COUNTER                                                  */
/* ────────────────────────────────────────────────────────────────── */
const useCountUp = (target, duration = 2000, started = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let start   = null;
    const step  = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);

  return count;
};

/* ────────────────────────────────────────────────────────────────── */
/*  STAT CARD (with IntersectionObserver trigger)                    */
/* ────────────────────────────────────────────────────────────────── */
const StatCard = ({ value, suffix, label }) => {
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  const count = useCountUp(value, 2200, started);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="ab-stat-card">
      <span className="ab-stat-number">
        {count.toLocaleString("en-IN")}
        {suffix}
      </span>
      <span className="ab-stat-label">{label}</span>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/*  FAQ ACCORDION                                                     */
/* ────────────────────────────────────────────────────────────────── */
const faqs = [
  {
    q: "How long does a consultation take?",
    a: "Our standard virtual consultation is 60 minutes. During this session, our designer discusses your requirements, reviews your space details, and outlines a preliminary design direction.",
  },
  {
    q: "What should I prepare before my consultation?",
    a: "Please have your room dimensions (length × width × height), reference images or an inspiration board, your approximate budget range, and any specific requirements ready. Photos of the existing space are very helpful.",
  },
  {
    q: "How much does a consultation cost?",
    a: "Our initial consultation is offered as a complimentary session so you can experience the ARCA design process with no commitment. Detailed project pricing is discussed during the consultation based on your scope.",
  },
  {
    q: "Can I reschedule my consultation?",
    a: "Yes. We request that you inform us at least 24 hours in advance. You can reach us at support@arca.in or call +91 98765 43210 and we will accommodate a new time.",
  },
  {
    q: "What cities do you currently serve?",
    a: "We currently offer services in Chennai, Madurai, Coimbatore, and Bangalore. Our virtual consultation model means we can also extend to other cities — please contact us to discuss.",
  },
  {
    q: "Do you provide 3D visualisation?",
    a: "Yes. After the initial consultation and requirement gathering, our team creates detailed 3D renders of your space so you can visualise the design before any work begins.",
  },
  {
    q: "What happens after I book a consultation?",
    a: "You will receive a confirmation email with your booking ID, meeting link, scheduled date and time, and an assigned designer. Join the Google Meet at the scheduled time to begin your session.",
  },
];

const FAQAccordion = () => {
  const [open, setOpen] = useState(null);

  return (
    <div className="ab-faq-list">
      {faqs.map((item, i) => (
        <div
          key={i}
          className={`ab-faq-item ${open === i ? "ab-faq-open" : ""}`}
        >
          <button
            className="ab-faq-question"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.q}</span>
            <span className="ab-faq-chevron">{open === i ? "−" : "+"}</span>
          </button>
          <div className="ab-faq-answer">
            <p>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   ABOUT PAGE
   ════════════════════════════════════════════════════════════════════ */
const About = () => {
  const navigate = useNavigate();

  return (
    <div className="ab-page">
      <Navbar />

      {/* ══════════════════════════════════════════════════════════
          1. HERO
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-hero">
        <div className="ab-hero-overlay" />
        <img src="/livingRoom.png" alt="ARCA interior" className="ab-hero-bg" />
        <div className="ab-hero-content">
          <p className="ab-hero-eyebrow">Est. in Vision &amp; Craft</p>
          <h1 className="ab-hero-heading">
            Designing<br />Timeless Interiors.
          </h1>
          <p className="ab-hero-sub">
            Where exceptional spaces are born from intention, precision and a
            relentless pursuit of beauty.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. WHO WE ARE
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-section ab-who">
        <div className="ab-section-inner ab-two-col">
          <div className="ab-who-text">
            <p className="ab-eyebrow">Who We Are</p>
            <h2 className="ab-section-heading">A Studio Built on Excellence</h2>
            <p className="ab-body-text">
              ARCA is a luxury interior design studio that transforms living spaces
              into curated environments reflecting the personality and aspirations
              of the people who inhabit them. We blend classical design principles
              with modern sensibility to create spaces that are both functionally
              superior and visually extraordinary.
            </p>
            <p className="ab-body-text">
              From intimate bedrooms to expansive open-plan living areas, we approach
              every project with the same commitment: to deliver a premium, personalised
              experience — one space at a time. Our virtual consultation model ensures
              that world-class design expertise is accessible to every home, in every city.
            </p>
            <ul className="ab-pillars">
              <li>Luxury interiors tailored to your lifestyle</li>
              <li>Modern living with timeless elegance</li>
              <li>Functional spaces built for real life</li>
              <li>Personalised consultation from day one</li>
            </ul>
          </div>
          <div className="ab-who-image">
            <img src="/bedroom.png" alt="ARCA bedroom design" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. OUR PROCESS (timeline)
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-section ab-process">
        <div className="ab-section-inner">
          <p className="ab-eyebrow ab-center">Our Process</p>
          <h2 className="ab-section-heading ab-center">
            From Vision to Reality
          </h2>

          <div className="ab-timeline">
            {[
              {
                step: "01",
                title: "Consultation",
                desc: "A dedicated virtual session to understand your vision, requirements and lifestyle expectations.",
              },
              {
                step: "02",
                title: "Requirement Gathering",
                desc: "Detailed documentation of spatial dimensions, material preferences, functional needs and budget.",
              },
              {
                step: "03",
                title: "3D Visualisation",
                desc: "Photorealistic renders of your space so you can experience the design before execution begins.",
              },
              {
                step: "04",
                title: "Design Approval",
                desc: "Collaborative review and refinement until every element aligns perfectly with your expectations.",
              },
              {
                step: "05",
                title: "Execution Guidance",
                desc: "End-to-end oversight of implementation, material procurement and quality checks on-site.",
              },
            ].map((item, i) => (
              <div key={i} className="ab-timeline-item">
                <div className="ab-timeline-left">
                  <div className="ab-timeline-dot">
                    <span>{item.step}</span>
                  </div>
                  {i < 4 && <div className="ab-timeline-line" />}
                </div>
                <div className="ab-timeline-content">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. WHY CHOOSE ARCA
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-section ab-why">
        <div className="ab-section-inner">
          <p className="ab-eyebrow ab-center">Why Choose Us</p>
          <h2 className="ab-section-heading ab-center">
            The ARCA Difference
          </h2>

          <div className="ab-why-grid">
            {[
              { icon: "🏆", title: "Experienced Designers", desc: "Our team brings years of expertise across luxury residential and commercial interiors." },
              { icon: "✦",  title: "Personalised Designs",  desc: "Every design is crafted uniquely for you — there are no templates, only bespoke solutions." },
              { icon: "🔍", title: "Transparent Process",  desc: "Complete clarity at every stage. No hidden costs, no surprises, just results." },
              { icon: "📹", title: "Virtual Consultation",  desc: "World-class design expertise delivered to your home through seamless virtual sessions." },
              { icon: "💎", title: "Premium Experience",   desc: "From first interaction to final delivery, we uphold the highest standard of service." },
              { icon: "🌿", title: "Sustainable Choices",  desc: "We source responsibly and integrate sustainable materials wherever possible." },
            ].map((card, i) => (
              <div key={i} className="ab-why-card">
                <div className="ab-why-icon">{card.icon}</div>
                <h3 className="ab-why-title">{card.title}</h3>
                <p className="ab-why-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. STATISTICS
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-section ab-stats">
        <div className="ab-section-inner">
          <div className="ab-stats-grid">
            <StatCard value={500}  suffix="+" label="Projects Designed" />
            <StatCard value={1200} suffix="+" label="Consultations Completed" />
            <StatCard value={800}  suffix="+" label="Happy Clients" />
            <StatCard value={2500} suffix="+" label="Design Concepts" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. FAQ
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-section ab-faq-section">
        <div className="ab-section-inner ab-faq-inner">
          <p className="ab-eyebrow ab-center">Frequently Asked Questions</p>
          <h2 className="ab-section-heading ab-center ab-faq-heading">
            Everything You Need to Know
          </h2>
          <FAQAccordion />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. CTA
          ══════════════════════════════════════════════════════════ */}
      <section className="ab-cta">
        <div className="ab-cta-inner">
          <p className="ab-cta-eyebrow">Ready to Begin?</p>
          <h2 className="ab-cta-heading">
            Book Your Consultation Today
          </h2>
          <p className="ab-cta-sub">
            Let our expert designers create a space that feels unmistakably you.
            The first step is a conversation.
          </p>
          <button
            className="ab-cta-btn"
            onClick={() => navigate("/?consultancy=true")}
          >
            Book a Consultation →
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
