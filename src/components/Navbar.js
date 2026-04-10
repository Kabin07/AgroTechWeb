import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/farmer", label: "🌱 Farmer" },
    { path: "/buyer", label: "🛒 Buyer" },
    { path: "/transport", label: "🚚 Transport" },
  ];

  return (
    <nav style={{
      background: "linear-gradient(90deg, #1a6b2f, #2d9e4f)",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "64px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 1000
    }}>

      <Link to="/" style={{
        color: "#fff",
        fontWeight: "800",
        fontSize: "1.4rem",
        textDecoration: "none",
        letterSpacing: "0.5px"
      }}>
        🌾 AgroTech
      </Link>

      <div style={{ display: "flex", gap: "8px" }}>
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                color: isActive ? "#1a6b2f" : "#fff",
                background: isActive ? "#fff" : "rgba(255,255,255,0.12)",
                padding: "8px 18px",
                borderRadius: "50px",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                border: "1.5px solid rgba(255,255,255,0.3)",
                transition: "all 0.2s"
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

    </nav>
  );
}

export default Navbar;