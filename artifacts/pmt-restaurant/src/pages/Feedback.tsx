import { useState } from "react";

// ── Decorative helpers (copied from Home for consistency) ──────────────────

function PapelPicadoBorder() {
  const colors = ["#0F5D2F", "#F4AA1C", "#A71F29", "#F4AA1C", "#0F5D2F", "#A71F29", "#F4AA1C", "#0F5D2F"];
  const W = 50, H = 32, count = 32;
  return (
    <div style={{ width: "100%", overflow: "hidden", height: H + 8 }}>
      <svg width={W * count} height={H + 8} style={{ display: "block" }}>
        <line x1="0" y1="4" x2={W * count} y2="4" stroke="#222" strokeWidth="1.5" opacity="0.3" />
        {Array.from({ length: count }).map((_, i) => (
          <polygon
            key={i}
            points={`${i * W},0 ${(i + 1) * W},0 ${i * W + W / 2},${H}`}
            fill={colors[i % colors.length]}
          />
        ))}
      </svg>
    </div>
  );
}

// ── Star rating widget ─────────────────────────────────────────────────────

const LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

function StarRating({
  value,
  onChange,
  color = "#F4AA1C",
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            aria-label={`Rate ${star} out of 5`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: 32,
              color: star <= active ? color : "#ccc",
              transform: star <= active ? "scale(1.15)" : "scale(1)",
              transition: "all 0.1s ease",
              lineHeight: 1,
            }}
          >
            ★
          </button>
        ))}
      </div>
      {active > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#0F5D2F", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {LABELS[active]}
        </span>
      )}
    </div>
  );
}

// ── Yes / No toggle ────────────────────────────────────────────────────────

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const btnStyle = (active: boolean, accent: string) => ({
    padding: "8px 28px",
    border: `2px solid ${active ? accent : "#ccc"}`,
    borderRadius: 8,
    background: active ? accent : "transparent",
    color: active ? "#fff" : "#666",
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  });
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" style={btnStyle(value === true, "#0F5D2F")} onClick={() => onChange(true)}>
        Yes
      </button>
      <button type="button" style={btnStyle(value === false, "#A71F29")} onClick={() => onChange(false)}>
        No
      </button>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────

function FormSection({ title, color = "#0F5D2F", children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", fontWeight: 900, color, margin: 0 }}>{title}</h2>
        <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, ${color}40, transparent)`, borderRadius: 1 }} />
      </div>
      {children}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 13, color: "#333", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "#A71F29", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "2px solid #e0dcd4",
  borderRadius: 8,
  fontFamily: "Montserrat, sans-serif",
  fontSize: 14,
  color: "#222",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
};

// ── Rating row ─────────────────────────────────────────────────────────────

function RatingRow({
  label,
  desc,
  value,
  onChange,
  color,
}: {
  label: string;
  desc: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "18px 20px",
      background: "#fff",
      borderRadius: 12,
      border: "2px solid #eee",
      marginBottom: 12,
    }}>
      <div>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "#222" }}>{label}</div>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#888", marginTop: 2 }}>{desc}</div>
      </div>
      <StarRating value={value} onChange={onChange} color={color} />
    </div>
  );
}

// ── Main feedback page ─────────────────────────────────────────────────────

type FormState = {
  name: string;
  email: string;
  phone: string;
  visitDate: string;
  itemsOrdered: string;
  ratingFood: number;
  ratingService: number;
  ratingAtmosphere: number;
  ratingValue: number;
  ratingOverall: number;
  wouldRecommend: boolean | null;
  comments: string;
  improvements: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  phone: "",
  visitDate: "",
  itemsOrdered: "",
  ratingFood: 0,
  ratingService: 0,
  ratingAtmosphere: 0,
  ratingValue: 0,
  ratingOverall: 0,
  wouldRecommend: null,
  comments: "",
  improvements: "",
};

export default function FeedbackPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (key: keyof FormState) => (val: any) => setForm((f) => ({ ...f, [key]: val }));
  const inp = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const allRated = form.ratingFood && form.ratingService && form.ratingAtmosphere && form.ratingValue && form.ratingOverall;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErrorMsg("Please enter your name.");
    if (!allRated) return setErrorMsg("Please rate all categories before submitting.");
    setErrorMsg("");
    setStatus("submitting");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ratingFood: form.ratingFood,
          ratingService: form.ratingService,
          ratingAtmosphere: form.ratingAtmosphere,
          ratingValue: form.ratingValue,
          ratingOverall: form.ratingOverall,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      setStatus("success");
      setForm(INITIAL);
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F5EF", fontFamily: "Montserrat, sans-serif" }}>
      {/* Papel picado border */}
      <PapelPicadoBorder />

      {/* Navbar */}
      <nav style={{
        background: "#F8F5EF",
        borderBottom: "2px solid #0F5D2F",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <a href="/" style={{ fontFamily: "Playfair Display, serif", fontSize: "1.6rem", fontWeight: 900, color: "#0F5D2F", textDecoration: "none" }}>
          PMT
        </a>
        <a href="/" style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, fontWeight: 600, color: "#0F5D2F", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          ← Back to Menu
        </a>
      </nav>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "48px 24px 32px" }}>
        <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: "#A71F29", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
          We'd love to hear from you
        </p>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 900, fontStyle: "italic", color: "#0F5D2F", lineHeight: 1.1, margin: "0 0 12px" }}>
          Share Your Experience
        </h1>
        {/* zigzag underline */}
        <svg viewBox="0 0 240 12" style={{ width: 240, height: 12, display: "block", margin: "0 auto 16px" }}>
          <polyline points="0,10 12,2 24,10 36,2 48,10 60,2 72,10 84,2 96,10 108,2 120,10 132,2 144,10 156,2 168,10 180,2 192,10 204,2 216,10 228,2 240,10" fill="none" stroke="#F4AA1C" strokeWidth="2.5" />
        </svg>
        <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 15, color: "#555", maxWidth: 520, margin: "0 auto" }}>
          Your feedback helps us serve Montreal better. Every review is read by our team — gracias!
        </p>
      </div>

      {/* Success state */}
      {status === "success" && (
        <div style={{ maxWidth: 600, margin: "0 auto 40px", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ background: "#0F5D2F", borderRadius: 16, padding: "40px 32px", color: "#fff" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌮</div>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "2rem", fontWeight: 900, fontStyle: "italic", marginBottom: 12 }}>
              Muchas Gracias!
            </h2>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 15, opacity: 0.9, marginBottom: 24 }}>
              Your feedback has been received. We truly appreciate you taking the time — it means the world to us.
            </p>
            <a
              href="/"
              style={{
                display: "inline-block",
                background: "#F4AA1C",
                color: "#222",
                padding: "12px 28px",
                borderRadius: 8,
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Back to Menu
            </a>
          </div>
        </div>
      )}

      {/* Form */}
      {status !== "success" && (
        <form onSubmit={handleSubmit} style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>

          {/* ── Client Info ── */}
          <FormSection title="Your Details" color="#0F5D2F">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <Field label="Your Name" required>
                <input
                  type="text"
                  placeholder="e.g. Sofia Martinez"
                  value={form.name}
                  onChange={inp("name")}
                  style={inputStyle}
                  required
                  data-testid="feedback-name"
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  placeholder="yourname@email.com"
                  value={form.email}
                  onChange={inp("email")}
                  style={inputStyle}
                  data-testid="feedback-email"
                />
              </Field>
              <Field label="Phone Number">
                <input
                  type="tel"
                  placeholder="+1 514 000 0000"
                  value={form.phone}
                  onChange={inp("phone")}
                  style={inputStyle}
                  data-testid="feedback-phone"
                />
              </Field>
              <Field label="Date of Visit">
                <input
                  type="date"
                  value={form.visitDate}
                  onChange={inp("visitDate")}
                  style={inputStyle}
                  data-testid="feedback-visit-date"
                />
              </Field>
            </div>
            <Field label="What did you order?">
              <textarea
                placeholder="e.g. Beef tacos, Shrimp burrito, Nachos N Guac, Churros..."
                value={form.itemsOrdered}
                onChange={inp("itemsOrdered")}
                style={{ ...textareaStyle, minHeight: 72 }}
                data-testid="feedback-items"
              />
            </Field>
          </FormSection>

          {/* ── Ratings ── */}
          <FormSection title="Rate Your Experience" color="#A71F29">
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "#666", marginBottom: 20 }}>
              Click the stars to rate each category — 1 is poor, 5 is excellent.
            </p>
            <RatingRow
              label="Food Quality"
              desc="Taste, freshness, presentation and portion size"
              value={form.ratingFood}
              onChange={set("ratingFood")}
              color="#F4AA1C"
            />
            <RatingRow
              label="Service"
              desc="Friendliness, speed, and attentiveness of our staff"
              value={form.ratingService}
              onChange={set("ratingService")}
              color="#0F5D2F"
            />
            <RatingRow
              label="Atmosphere"
              desc="Ambiance, cleanliness, and overall vibe of the restaurant"
              value={form.ratingAtmosphere}
              onChange={set("ratingAtmosphere")}
              color="#A71F29"
            />
            <RatingRow
              label="Value for Money"
              desc="Did the quality match the price you paid?"
              value={form.ratingValue}
              onChange={set("ratingValue")}
              color="#F4AA1C"
            />
            <RatingRow
              label="Overall Experience"
              desc="Your overall impression of your visit to PMT"
              value={form.ratingOverall}
              onChange={set("ratingOverall")}
              color="#0F5D2F"
            />
          </FormSection>

          {/* ── Recommendations ── */}
          <FormSection title="A Few More Questions" color="#F4AA1C">
            <Field label="Would you recommend PMT to a friend or family member?">
              <YesNoToggle value={form.wouldRecommend} onChange={set("wouldRecommend")} />
            </Field>
            <Field label="Any comments or highlights from your visit?">
              <textarea
                placeholder="Tell us what you loved, a dish that stood out, or a memorable moment..."
                value={form.comments}
                onChange={inp("comments")}
                style={textareaStyle}
                data-testid="feedback-comments"
              />
            </Field>
            <Field label="What could we improve?">
              <textarea
                placeholder="Any suggestions on how we can make your next visit even better?"
                value={form.improvements}
                onChange={inp("improvements")}
                style={textareaStyle}
                data-testid="feedback-improvements"
              />
            </Field>
          </FormSection>

          {/* Error */}
          {(status === "error" || errorMsg) && (
            <div style={{
              background: "#fef2f2",
              border: "2px solid #A71F29",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              fontFamily: "Montserrat, sans-serif",
              fontSize: 14,
              color: "#A71F29",
              fontWeight: 600,
            }}>
              {errorMsg || "Something went wrong. Please try again."}
            </div>
          )}

          {/* Submit */}
          <div style={{ textAlign: "center" }}>
            <button
              type="submit"
              disabled={status === "submitting"}
              data-testid="feedback-submit"
              style={{
                background: status === "submitting" ? "#999" : "#0F5D2F",
                color: "#fff",
                border: "none",
                padding: "16px 48px",
                borderRadius: 8,
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 800,
                fontSize: 15,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: status === "submitting" ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 16px rgba(15,93,47,0.3)",
              }}
            >
              {status === "submitting" ? "Sending..." : "Submit Feedback"}
            </button>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#999", marginTop: 12 }}>
              Your response is completely confidential.
            </p>
          </div>
        </form>
      )}

      {/* Bottom papel picado */}
      <PapelPicadoBorder />
    </div>
  );
}
