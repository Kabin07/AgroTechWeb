import React, { useState } from "react";
import HistoryPanel from "./HistoryPanel";

function Farmer({
  crops, setCrops,
  requests, setRequests,
  orders, setOrders,
  transportDeals, setTransportDeals
}) {

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [activeTab, setActiveTab] = useState("add");

  const cropEmojis = {
    Rice: "🌾", Wheat: "🌿", Corn: "🌽",
    Tomato: "🍅", Potato: "🥔"
  };

  function addCrop() {
    if (name === "" || quantity === "" || price === "") {
      alert("Fill all fields"); return;
    }
    setCrops([...crops, { name, quantity, price }]);
    setName(""); setQuantity(""); setPrice("");
  }

  function acceptRequest(req, index) {
    const newOrder = {
      crop: req.name, quantity: req.quantity,
      buyerName: req.buyerName,
      farmerName: farmerName || "Farmer A",
      status: "Shipped"
    };
    setOrders([...orders, newOrder]);
    setTransportDeals([...transportDeals, {
      crop: req.name, quantity: req.quantity,
      buyerName: req.buyerName,
      farmerName: farmerName || "Farmer A",
      status: "Dispatched"
    }]);
    setRequests(requests.filter((_, i) => i !== index));
  }

  function acceptPurchase(order, index) {
    setOrders(orders.map((o, i) =>
      i === index ? { ...o, farmerName: farmerName || "Farmer A", status: "Shipped" } : o
    ));
    setTransportDeals([...transportDeals, {
      crop: order.crop, quantity: order.quantity,
      buyerName: order.buyerName,
      farmerName: farmerName || "Farmer A",
      status: "Dispatched"
    }]);
  }

  const tabs = [
    { id: "add", label: "➕ Add Crop" },
    { id: "requests", label: `📋 Requests ${requests.length > 0 ? `(${requests.length})` : ""}` },
    { id: "purchases", label: `🛒 Purchases ${orders.filter(o => o.status === "Pending").length > 0 ? `(${orders.filter(o => o.status === "Pending").length})` : ""}` },
    { id: "history", label: "📜 History" },
  ];

  return (
    <div style={{ background: "#f0f7f0", minHeight: "100vh" }}>

      {/* Page Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a6b2f 0%, #2d9e4f 60%, #4caf50 100%)",
        padding: "40px 32px 32px",
        color: "#fff"
      }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "50%", width: "64px", height: "64px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem"
            }}>👨‍🌾</div>
            <div>
              <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem" }}>Farmer Dashboard</h2>
              <p style={{ margin: 0, opacity: 0.85, fontSize: "1rem" }}>
                Manage your crops, requests and sales
              </p>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <input
                placeholder="Your Farmer Name"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1.5px solid rgba(255,255,255,0.5)",
                  borderRadius: "50px",
                  padding: "10px 20px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  minWidth: "220px"
                }}
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{
            display: "flex", gap: "24px", marginTop: "28px", flexWrap: "wrap"
          }}>
            {[
              { label: "Crops Listed", value: crops.length, icon: "🌾" },
              { label: "Pending Requests", value: requests.length, icon: "📋" },
              { label: "Pending Purchases", value: orders.filter(o => o.status === "Pending").length, icon: "🛒" },
              { label: "Shipped Orders", value: orders.filter(o => o.status === "Shipped").length, icon: "🚚" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "14px 24px",
                border: "1px solid rgba(255,255,255,0.25)",
                textAlign: "center",
                minWidth: "120px"
              }}>
                <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800" }}>{s.value}</div>
                <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "2px solid #e0f0e0" }}>
        <div className="container" style={{ display: "flex", gap: "0", overflowX: "auto" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "16px 24px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid #1a6b2f" : "3px solid transparent",
              color: activeTab === tab.id ? "#1a6b2f" : "#666",
              fontWeight: activeTab === tab.id ? "700" : "500",
              fontSize: "14px",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ padding: "32px 16px" }}>

        {/* ── ADD CROP TAB ── */}
        {activeTab === "add" && (
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{
              background: "#fff", borderRadius: "20px",
              padding: "36px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
            }}>
              <h4 style={{ fontWeight: "800", color: "#1a6b2f", marginBottom: "24px" }}>
                🌱 List a New Crop
              </h4>

              <label style={labelStyle}>Select Crop</label>
              <select value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}>
                <option value="">-- Choose Crop --</option>
                {["Rice", "Wheat", "Corn", "Tomato", "Potato"].map(c => (
                  <option key={c}>{cropEmojis[c]} {c}</option>
                ))}
              </select>

              <label style={labelStyle}>Quantity (in kg)</label>
              <input
                type="number" placeholder="e.g. 500"
                value={quantity} onChange={(e) => setQuantity(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>Price per kg (₹)</label>
              <input
                type="number" placeholder="e.g. 25"
                value={price} onChange={(e) => setPrice(e.target.value)}
                style={inputStyle}
              />

              <button onClick={addCrop} style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #1a6b2f, #2d9e4f)",
                color: "#fff", border: "none", borderRadius: "12px",
                fontWeight: "700", fontSize: "16px", cursor: "pointer",
                marginTop: "8px", boxShadow: "0 4px 12px rgba(26,107,47,0.3)"
              }}>
                ➕ Add Crop to Marketplace
              </button>
            </div>

            {/* Listed Crops Preview */}
            {crops.length > 0 && (
              <div style={{ marginTop: "32px" }}>
                <h5 style={{ fontWeight: "700", color: "#333", marginBottom: "16px" }}>
                  Your Listed Crops ({crops.length})
                </h5>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {crops.map((crop, i) => (
                    <div key={i} style={{
                      background: "#fff", borderRadius: "14px",
                      padding: "16px 20px", display: "flex",
                      alignItems: "center", justifyContent: "space-between",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                      border: "1.5px solid #e8f5e9"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "2rem" }}>{cropEmojis[crop.name] || "🌿"}</span>
                        <div>
                          <div style={{ fontWeight: "700", color: "#1a1a1a" }}>{crop.name}</div>
                          <div style={{ fontSize: "13px", color: "#888" }}>{crop.quantity} kg</div>
                        </div>
                      </div>
                      <div style={{
                        background: "#e8f5e9", color: "#1a6b2f",
                        padding: "6px 14px", borderRadius: "50px",
                        fontWeight: "700", fontSize: "15px"
                      }}>
                        ₹{crop.price}/kg
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {activeTab === "requests" && (
          <div>
            <h4 style={{ fontWeight: "800", color: "#333", marginBottom: "24px" }}>
              📋 Buyer Requests ({requests.length})
            </h4>
            {requests.length === 0 ? (
              <EmptyState icon="📭" text="No buyer requests yet" />
            ) : (
              <div className="row g-3">
                {requests.map((req, index) => (
                  <div key={index} className="col-md-4">
                    <div style={{
                      background: "#fff", borderRadius: "16px",
                      padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                      border: "1.5px solid #e3f2fd", height: "100%"
                    }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
                        {cropEmojis[req.name] || "🌿"}
                      </div>
                      <h5 style={{ fontWeight: "800", marginBottom: "8px" }}>{req.name}</h5>
                      <div style={tagStyle("blue")}>👤 {req.buyerName}</div>
                      <div style={tagStyle("orange")}>📦 {req.quantity} kg required</div>
                      <button
                        onClick={() => acceptRequest(req, index)}
                        style={actionBtnStyle("#1a6b2f")}
                      >
                        ✅ Accept Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASES TAB ── */}
        {activeTab === "purchases" && (
          <div>
            <h4 style={{ fontWeight: "800", color: "#333", marginBottom: "24px" }}>
              🛒 Pending Buyer Purchases
            </h4>
            {orders.filter(o => o.status === "Pending").length === 0 ? (
              <EmptyState icon="🛍️" text="No pending purchases" />
            ) : (
              <div className="row g-3">
                {orders.map((order, index) =>
                  order.status === "Pending" ? (
                    <div key={index} className="col-md-4">
                      <div style={{
                        background: "#fff", borderRadius: "16px",
                        padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                        border: "1.5px solid #fff3e0"
                      }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
                          {cropEmojis[order.crop] || "🌿"}
                        </div>
                        <h5 style={{ fontWeight: "800", marginBottom: "8px" }}>{order.crop}</h5>
                        <div style={tagStyle("blue")}>👤 {order.buyerName}</div>
                        <div style={tagStyle("orange")}>📦 {order.quantity} kg</div>
                        <div style={{
                          display: "inline-block",
                          background: "#fff3e0", color: "#e65100",
                          padding: "4px 12px", borderRadius: "50px",
                          fontSize: "12px", fontWeight: "600", marginBottom: "16px"
                        }}>⏳ Pending</div>
                        <button
                          onClick={() => acceptPurchase(order, index)}
                          style={actionBtnStyle("#e65100")}
                        >
                          🚚 Accept & Ship
                        </button>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div>
            <h4 style={{ fontWeight: "800", color: "#333", marginBottom: "24px" }}>
              📜 Order History
            </h4>
            <HistoryPanel orders={orders} />
          </div>
        )}

      </div>
    </div>
  );
}

// ── Shared Styles ──

const labelStyle = {
  display: "block", fontWeight: "600",
  fontSize: "13px", color: "#444",
  marginBottom: "6px", marginTop: "16px"
};

const inputStyle = {
  width: "100%", padding: "12px 16px",
  border: "1.5px solid #d0e8d0",
  borderRadius: "10px", fontSize: "15px",
  outline: "none", background: "#f8fdf9",
  color: "#1a1a1a", boxSizing: "border-box"
};

function tagStyle(color) {
  const map = {
    blue: { bg: "#e3f2fd", text: "#1565c0" },
    orange: { bg: "#fff3e0", text: "#e65100" }
  };
  return {
    display: "inline-block",
    background: map[color].bg, color: map[color].text,
    padding: "4px 12px", borderRadius: "50px",
    fontSize: "13px", fontWeight: "600",
    marginBottom: "8px", marginRight: "6px"
  };
}

function actionBtnStyle(bg) {
  return {
    display: "block", width: "100%",
    marginTop: "16px", padding: "12px",
    background: bg, color: "#fff",
    border: "none", borderRadius: "10px",
    fontWeight: "700", fontSize: "14px",
    cursor: "pointer"
  };
}

function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: "center", padding: "60px 20px",
      background: "#fff", borderRadius: "16px",
      border: "1.5px dashed #c8e6c9"
    }}>
      <div style={{ fontSize: "3rem", marginBottom: "12px" }}>{icon}</div>
      <p style={{ color: "#888", fontSize: "1rem" }}>{text}</p>
    </div>
  );
}

export default Farmer;