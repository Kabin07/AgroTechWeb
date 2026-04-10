import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div>

      {/* Hero Section */}
      <div style={{
        background: "linear-gradient(135deg, #1a6b2f 0%, #2d9e4f 50%, #f4a623 100%)",
        minHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden"
      }}>

        {/* Background circles decoration */}
        <div style={{
          position: "absolute", top: "-80px", left: "-80px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)"
        }} />
        <div style={{
          position: "absolute", bottom: "-100px", right: "-60px",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)"
        }} />
        <div style={{
          position: "absolute", top: "40%", left: "10%",
          width: "150px", height: "150px", borderRadius: "50%",
          background: "rgba(255,255,255,0.04)"
        }} />

        {/* Badge */}
        <span style={{
          background: "rgba(255,255,255,0.2)",
          color: "#fff",
          padding: "6px 18px",
          borderRadius: "50px",
          fontSize: "13px",
          fontWeight: "600",
          letterSpacing: "1px",
          marginBottom: "20px",
          border: "1px solid rgba(255,255,255,0.3)"
        }}>
          🌾 INDIA'S LEADING AGRI PLATFORM
        </span>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(2.2rem, 6vw, 4rem)",
          fontWeight: "800",
          color: "#fff",
          marginBottom: "16px",
          lineHeight: "1.2",
          textShadow: "0 2px 10px rgba(0,0,0,0.2)"
        }}>
          AgroTech Marketplace
        </h1>

        <p style={{
          fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
          color: "rgba(255,255,255,0.88)",
          maxWidth: "580px",
          marginBottom: "36px",
          lineHeight: "1.7"
        }}>
          Connecting Farmers, Buyers and Transport Services — directly, digitally, and efficiently across India.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/farmer" style={{
            background: "#fff",
            color: "#1a6b2f",
            padding: "14px 32px",
            borderRadius: "50px",
            fontWeight: "700",
            fontSize: "15px",
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            transition: "transform 0.2s"
          }}>
            🌱 Start Selling
          </Link>
          <Link to="/buyer" style={{
            background: "transparent",
            color: "#fff",
            padding: "14px 32px",
            borderRadius: "50px",
            fontWeight: "700",
            fontSize: "15px",
            textDecoration: "none",
            border: "2px solid rgba(255,255,255,0.8)",
            transition: "transform 0.2s"
          }}>
            🛒 Browse Crops
          </Link>
        </div>

        {/* Stats Row */}
        <div style={{
          display: "flex",
          gap: "40px",
          marginTop: "60px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          {[
            { value: "10,000+", label: "Farmers Registered" },
            { value: "₹50Cr+", label: "Crops Traded" },
            { value: "500+", label: "Transport Partners" },
            { value: "28", label: "States Covered" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#fff" }}>{stat.value}</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div style={{ background: "#f8fdf9", padding: "70px 20px" }}>
        <div className="container">

          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "#1a6b2f" }}>
              Everything You Need in One Place
            </h2>
            <p style={{ color: "#666", fontSize: "1.05rem", marginTop: "10px" }}>
              A complete agri-commerce ecosystem built for Bharat
            </p>
          </div>

          <div className="row g-4">
            {[
              {
                icon: "🌾",
                title: "Sell Crops",
                desc: "Farmers list their harvest with live pricing, quantity, and photos. Reach thousands of buyers instantly.",
                link: "/farmer",
                btnText: "Go to Farmer Dashboard",
                color: "#e8f5e9",
                border: "#a5d6a7"
              },
              {
                icon: "🛒",
                title: "Buy Crops",
                desc: "Buyers browse fresh produce directly from farmers — no middlemen, better prices, guaranteed quality.",
                link: "/buyer",
                btnText: "Go to Buyer Dashboard",
                color: "#fff8e1",
                border: "#ffe082"
              },
              {
                icon: "🚚",
                title: "Transport Booking",
                desc: "Book verified vehicles for crop delivery. Track shipments and manage logistics all in one place.",
                link: "/transport",
                btnText: "Book Transport",
                color: "#e3f2fd",
                border: "#90caf9"
              },
            ].map((card, i) => (
              <div key={i} className="col-md-4">
                <div style={{
                  background: card.color,
                  border: `1.5px solid ${card.border}`,
                  borderRadius: "18px",
                  padding: "36px 28px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{card.icon}</div>
                  <h4 style={{ fontWeight: "800", color: "#1a1a1a", marginBottom: "12px" }}>{card.title}</h4>
                  <p style={{ color: "#555", lineHeight: "1.7", flexGrow: 1 }}>{card.desc}</p>
                  <Link to={card.link} style={{
                    marginTop: "24px",
                    display: "inline-block",
                    background: "#1a6b2f",
                    color: "#fff",
                    padding: "11px 24px",
                    borderRadius: "50px",
                    fontWeight: "600",
                    fontSize: "14px",
                    textDecoration: "none",
                    textAlign: "center"
                  }}>
                    {card.btnText} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ background: "#fff", padding: "70px 20px" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "#1a6b2f" }}>How It Works</h2>
            <p style={{ color: "#666", fontSize: "1.05rem", marginTop: "10px" }}>Simple steps to get started</p>
          </div>
          <div className="row g-4 text-center">
            {[
              { step: "01", icon: "📝", title: "Register", desc: "Sign up as a Farmer, Buyer, or Transport Provider in seconds." },
              { step: "02", icon: "📦", title: "List or Browse", desc: "Farmers list crops. Buyers browse and place orders directly." },
              { step: "03", icon: "🤝", title: "Deal & Pay", desc: "Negotiate, confirm the deal, and pay securely on the platform." },
              { step: "04", icon: "🚚", title: "Deliver", desc: "Book transport and track your crops until delivery is complete." },
            ].map((s, i) => (
              <div key={i} className="col-md-3 col-6">
                <div style={{
                  background: "#f8fdf9",
                  borderRadius: "16px",
                  padding: "32px 20px",
                  border: "1.5px solid #c8e6c9"
                }}>
                  <div style={{
                    fontSize: "11px", fontWeight: "800", color: "#2d9e4f",
                    letterSpacing: "2px", marginBottom: "12px"
                  }}>STEP {s.step}</div>
                  <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{s.icon}</div>
                  <h5 style={{ fontWeight: "700", marginBottom: "8px" }}>{s.title}</h5>
                  <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: "1.6" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crops Banner */}
      <div style={{
        background: "linear-gradient(135deg, #f4a623, #e8821a)",
        padding: "50px 20px",
        textAlign: "center"
      }}>
        <h3 style={{ color: "#fff", fontWeight: "800", fontSize: "1.7rem", marginBottom: "12px" }}>
          🌽 Crops Available: Rice · Wheat · Corn · Tomato · Potato · Onion · Soybean · Cotton
        </h3>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1rem", marginBottom: "24px" }}>
          Fresh from the fields. Listed daily by farmers across India.
        </p>
        <Link to="/buyer" style={{
          background: "#fff",
          color: "#e8821a",
          padding: "13px 32px",
          borderRadius: "50px",
          fontWeight: "700",
          textDecoration: "none",
          fontSize: "15px"
        }}>
          Shop Now →
        </Link>
      </div>

      {/* Footer */}
      <div style={{
        background: "#1a6b2f",
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
        padding: "24px",
        fontSize: "14px"
      }}>
        © 2025 AgroTech Marketplace · Empowering Indian Agriculture 🌾
      </div>

    </div>
  );
}

export default Home;