import React, { useState } from "react";
import HistoryPanel from "./HistoryPanel";

const cropEmojis = {
  Rice: "🌾", Wheat: "🌿", Corn: "🌽", Tomato: "🍅", Potato: "🥔",
};

const cropImages = {
  Rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
  Wheat: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80",
  Corn: "https://images.unsplash.com/photo-1601593346740-925612772716?w=400&q=80",
  Tomato: "https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=400&q=80",
  Potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80",
};

export default function Buyer({ crops, setCrops, requests, setRequests, orders, setOrders }) {
  const [buyerName, setBuyerName] = useState("");
  const [reqCrop, setReqCrop] = useState("");
  const [reqQty, setReqQty] = useState("");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function addRequirement() {
    if (!buyerName || !reqCrop || !reqQty) {
      showToast("Please fill all fields", "error");
      return;
    }
    setRequests([...requests, { name: reqCrop, quantity: reqQty, buyerName }]);
    setReqCrop("");
    setReqQty("");
    showToast(`Requirement for ${reqCrop} added!`);
  }

  function buyCrop(crop, index) {
    if (!buyerName) {
      showToast("Enter your buyer name first", "error");
      return;
    }
    const newOrder = {
      crop: crop.name,
      quantity: crop.quantity,
      buyerName: buyerName || "Buyer A",
      farmerName: "Pending",
      status: "Pending",
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setOrders([...orders, newOrder]);
    setCrops(crops.filter((_, i) => i !== index));
    showToast(`${crop.name} purchased successfully! 🎉`);
  }

  const filteredCrops = (crops || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .buyer-root {
          min-height: 100vh;
          background: #f0faf4;
          font-family: 'DM Sans', sans-serif;
          padding-bottom: 120px;
        }

        .buyer-hero {
          background: linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%);
          padding: 40px 48px 48px;
          position: relative;
          overflow: hidden;
        }

        .buyer-hero::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 280px; height: 280px;
          background: rgba(255,255,255,0.04);
          border-radius: 50%;
        }

        .buyer-hero::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -40px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.03);
          border-radius: 50%;
        }

        .buyer-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          color: #fff;
          margin: 0 0 6px;
          position: relative;
          z-index: 1;
        }

        .buyer-hero-sub {
          color: #bbf7d0;
          font-size: 14px;
          font-weight: 400;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        .buyer-body {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .buyer-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 36px;
        }

        @media (max-width: 768px) {
          .buyer-grid-2 { grid-template-columns: 1fr; }
        }

        .buyer-section-card {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.06);
          border: 1px solid #e2f5ea;
        }

        .buyer-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          color: #14532d;
          margin: 0 0 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .buyer-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .buyer-input {
          width: 100%;
          padding: 11px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          margin-bottom: 14px;
          outline: none;
        }

        .buyer-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
          background: #fff;
        }

        .buyer-select {
          width: 100%;
          padding: 11px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          cursor: pointer;
          transition: border-color 0.2s;
          margin-bottom: 14px;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          box-sizing: border-box;
        }

        .buyer-select:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
        }

        .buyer-btn-primary {
          background: linear-gradient(135deg, #15803d, #16a34a);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.02em;
        }

        .buyer-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.35);
        }

        .buyer-btn-primary:active { transform: translateY(0); }

        .buyer-name-bar {
          background: #fff;
          border-radius: 20px;
          padding: 20px 28px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.06);
          border: 1px solid #e2f5ea;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .buyer-name-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .buyer-name-bar .buyer-input {
          margin-bottom: 0;
          flex: 1;
        }

        /* Requirements */
        .req-list {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .req-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .req-chip-crop {
          font-weight: 600;
          color: #14532d;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .req-chip-qty {
          background: #dcfce7;
          color: #166534;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
        }

        /* Crops Section */
        .crops-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .crops-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          color: #14532d;
          margin: 0;
        }

        .crops-search {
          padding: 9px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 99px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #111827;
          outline: none;
          width: 200px;
          transition: border-color 0.2s;
        }

        .crops-search:focus { border-color: #16a34a; }

        .crops-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .crop-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
          border: 1px solid #e2f5ea;
          transition: transform 0.25s, box-shadow 0.25s;
          animation: fadeUp 0.4s ease;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .crop-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(21, 128, 61, 0.15);
        }

        .crop-card-img {
          width: 100%;
          height: 170px;
          object-fit: cover;
          display: block;
          transition: transform 0.4s;
        }

        .crop-card:hover .crop-card-img {
          transform: scale(1.04);
        }

        .crop-card-img-wrap {
          overflow: hidden;
          position: relative;
        }

        .crop-card-emoji {
          position: absolute;
          top: 10px; left: 12px;
          background: rgba(255,255,255,0.92);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 20px;
        }

        .crop-card-body {
          padding: 16px;
        }

        .crop-card-name {
          font-family: 'Playfair Display', serif;
          font-size: 19px;
          color: #14532d;
          margin: 0 0 10px;
        }

        .crop-card-meta {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }

        .crop-card-tag {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .crop-price-tag {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .crop-buy-btn {
          background: linear-gradient(135deg, #15803d, #16a34a);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.02em;
        }

        .crop-buy-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(22, 163, 74, 0.3);
        }

        .empty-crops {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
          grid-column: 1/-1;
        }

        .empty-crops-icon { font-size: 48px; display: block; margin-bottom: 12px; }
        .empty-crops-text { font-size: 15px; }

        /* Toast */
        .buyer-toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          background: #14532d;
          color: #fff;
          padding: 12px 24px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 8px 30px rgba(0,0,0,0.18);
          animation: toastIn 0.3s ease;
          white-space: nowrap;
        }

        .buyer-toast.error { background: #dc2626; }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {toast && (
        <div className={`buyer-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.msg}
        </div>
      )}

      <div className="buyer-root">
        <div className="buyer-hero">
          <h1 className="buyer-hero-title">Buyer Dashboard</h1>
          <p className="buyer-hero-sub">Browse fresh produce directly from verified farmers</p>
        </div>

        <div className="buyer-body">
          {/* Buyer name bar */}
          <div className="buyer-name-bar">
            <div className="buyer-name-icon">👤</div>
            <input
              className="buyer-input"
              placeholder="Enter your name to get started..."
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>

          {/* Two-column: Profile + Requirements */}
          <div className="buyer-grid-2">
            <div className="buyer-section-card">
              <h3 className="buyer-section-title">🌱 Add Crop Requirement</h3>
              <label className="buyer-label">Crop Type</label>
              <select className="buyer-select" value={reqCrop} onChange={(e) => setReqCrop(e.target.value)}>
                <option value="">Select a crop</option>
                {["Rice", "Wheat", "Corn", "Tomato", "Potato"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label className="buyer-label">Required Quantity</label>
              <input
                className="buyer-input"
                placeholder="e.g. 50 kg"
                value={reqQty}
                onChange={(e) => setReqQty(e.target.value)}
              />
              <button className="buyer-btn-primary" onClick={addRequirement}>
                + Add Requirement
              </button>
            </div>

            <div className="buyer-section-card">
              <h3 className="buyer-section-title">📋 My Requirements</h3>
              {(requests || []).length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 13 }}>No requirements added yet.</p>
              ) : (
                <div className="req-list">
                  {(requests || []).map((r, i) => (
                    <div className="req-chip" key={i}>
                      <span className="req-chip-crop">
                        {cropEmojis[r.name] || "🌿"} {r.name}
                      </span>
                      <span className="req-chip-qty">{r.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Crops */}
          <div className="crops-section-header">
            <h2 className="crops-section-title">🛒 Available Crops</h2>
            <input
              className="crops-search"
              placeholder="🔍 Search crops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="crops-grid">
            {filteredCrops.length === 0 ? (
              <div className="empty-crops">
                <span className="empty-crops-icon">🌾</span>
                <p className="empty-crops-text">
                  {search ? `No crops matching "${search}"` : "No crops available right now"}
                </p>
              </div>
            ) : (
              filteredCrops.map((crop, index) => {
                const emoji = cropEmojis[crop.name] || "🌿";
                const img = cropImages[crop.name] || `https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80`;
                return (
                  <div className="crop-card" key={index}>
                    <div className="crop-card-img-wrap">
                      <img src={img} alt={crop.name} className="crop-card-img" />
                      <span className="crop-card-emoji">{emoji}</span>
                    </div>
                    <div className="crop-card-body">
                      <h4 className="crop-card-name">{crop.name}</h4>
                      <div className="crop-card-meta">
                        <span className="crop-card-tag">📦 {crop.quantity}</span>
                        <span className="crop-price-tag">₹{crop.price}</span>
                      </div>
                      <button className="crop-buy-btn" onClick={() => buyCrop(crop, index)}>
                        Buy Now
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <HistoryPanel orders={orders} />
    </>
  );
}