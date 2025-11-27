import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      color: "#00ffa3",
      padding: "20px"
    }}>
      <h1 style={{
        fontSize: "48px",
        fontWeight: "700",
        textShadow: "0 0 30px rgba(0,255,163,0.7)"
      }}>
        404 — Page Not Found
      </h1>

      <p style={{
        color: "#9ca3af",
        fontSize: "16px",
        marginTop: "10px"
      }}>
        Oops! This page doesn’t exist.
      </p>

      <Link 
        to="/" 
        style={{
          marginTop: "30px",
          padding: "12px 24px",
          borderRadius: "8px",
          background: "rgba(0,255,163,0.15)",
          border: "1px solid rgba(0,255,163,0.4)",
          color: "#00ffa3",
          fontWeight: "600",
          textDecoration: "none",
          transition: "all 0.3s ease",
          boxShadow: "0 0 20px rgba(0,255,163,0.3)"
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(0,255,163,0.25)";
          e.target.style.boxShadow = "0 0 30px rgba(0,255,163,0.6)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(0,255,163,0.15)";
          e.target.style.boxShadow = "0 0 20px rgba(0,255,163,0.3)";
        }}
      >
        ← Back to Home
      </Link>
    </div>
  );
}
