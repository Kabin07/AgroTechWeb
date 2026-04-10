import React, { useState } from "react";

const vehicleConfig = {
  Truck: {
    emoji: "🚛",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80",
    color: "#166534",
    bg: "#dcfce7",
  },
  "Mini Van": {
    emoji: "🚐",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&q=80",
    color: "#1d4ed8",
    bg: "#dbeafe",
  },
  Pickup: {
    emoji: "🛻",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    color: "#b45309",
    bg: "#fef3c7",
  },
};

const statusConfig = {
  Dispatched: { color: "#2563eb", bg: "#dbeafe", icon: "📦" },
  "On the Way": { color: "#d97706", bg: "#fef3c7", icon: "🚚" },
  Delivered: { color: "#16a34a", bg: "#dcfce7", icon: "✅" },
};

const cropEmojis = {
  Rice: "🌾", Wheat: "🌿", Corn: "🌽", Tomato: "🍅", Potato: "🥔",
};

export default function Transport({ transportDeals }) {
  const [orders, setOrders] = useState([
    { id: 1, crop: "Rice", from: "Chennai", to: "Madurai", vehicle: "Truck", status: "Dispatched", date: "Apr 05, 2026" },
    { id: 2, crop: "Wheat", from: "Salem", to: "Coimbatore", vehicle: "Mini Van", status: "On the Way", date: "Apr 06, 2026" },
  ]);

  const [crop, setCrop] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vehicle, setVehicle] = useState("Truck");
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function addOrder() {
    if (!crop || !from || !to) {
      showToast("Please fill all fields", "error");
      return;
    }
    const newOrder = {
      id: Date.now(),
      crop, from, to, vehicle,
      status: "Dispatched",
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setOrders([...orders, newOrder]);
    setCrop(""); setFrom(""); setTo("");
    showToast(`${vehicle} dispatched for ${crop}! 🚛`);
  }

  function updateStatus(id, newStatus) {
    if (newStatus === "Change Status") return;
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    showToast(`Status updated to "${newStatus}"`);
  }

  function removeOrder(id) {
    setOrders(orders.filter(o => o.id !== id));
    showToast("Order removed");
  }

  const dealOrders = (transportDeals || []).map((deal, i) => ({
    id: 100 + i,
    crop: deal.crop,
    from: "Farmer Location",
    to: "Buyer Location",
    vehicle: "Truck",
    status: deal.status || "Dispatched",
    date: deal.date || "—",
  }));

  const allOrders = [...dealOrders, ...orders];
  const filtered = filterStatus === "All" ? allOrders : allOrders.filter(o => o.status === filterStatus);

  const stats = {
    total: allOrders.length,
    dispatched: allOrders.filter(o => o.status === "Dispatched").length,
    onWay: allOrders.filter(o => o.status === "On the Way").length,
    delivered: allOrders.filter(o => o.status === "Delivered").length,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .tp-root {
          min-height: 100vh;
          background: #f0faf4;
          font-family: 'DM Sans', sans-serif;
        }

        .tp-hero {
          background: linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%);
          padding: 40px 48px 56px;
          position: relative;
          overflow: hidden;
        }

        .tp-hero::before {
          content: '🚛';
          position: absolute;
          right: 40px; top: 20px;
          font-size: 100px;
          opacity: 0.07;
          transform: scaleX(-1);
        }

        .tp-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          color: #fff;
          margin: 0 0 6px;
        }

        .tp-hero-sub {
          color: #bbf7d0;
          font-size: 14px;
          margin: 0 0 28px;
        }

        .tp-stats-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .tp-stat-chip {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          padding: 12px 20px;
          color: #fff;
          backdrop-filter: blur(4px);
          min-width: 100px;
        }

        .tp-stat-num {
          font-size: 26px;
          font-weight: 700;
          font-family: 'Playfair Display', serif;
          display: block;
        }

        .tp-stat-label {
          font-size: 11px;
          color: #bbf7d0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        .tp-body {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .tp-form-card {
          background: #fff;
          border-radius: 20px;
          padding: 28px 32px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.06);
          border: 1px solid #e2f5ea;
          margin-bottom: 32px;
        }

        .tp-form-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: #14532d;
          margin: 0 0 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tp-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .tp-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tp-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .tp-input, .tp-select {
          padding: 11px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .tp-input:focus, .tp-select:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
          background: #fff;
        }

        .tp-select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-color: #fafafa;
          padding-right: 34px;
        }

        .tp-btn-add {
          background: linear-gradient(135deg, #15803d, #16a34a);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.02em;
        }

        .tp-btn-add:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.35);
        }

        /* Filter bar */
        .tp-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .tp-filter-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          color: #14532d;
          margin: 0;
        }

        .tp-filter-pills {
          display: flex;
          gap: 8px;
        }

        .tp-pill {
          padding: 6px 16px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          color: #6b7280;
          transition: all 0.2s;
        }

        .tp-pill.active {
          background: #14532d;
          border-color: #14532d;
          color: #fff;
        }

        /* Order cards grid */
        .tp-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .tp-order-card {
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

        .tp-order-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(21, 128, 61, 0.14);
        }

        .tp-card-img-wrap {
          position: relative;
          overflow: hidden;
          height: 160px;
        }

        .tp-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s;
        }

        .tp-order-card:hover .tp-card-img { transform: scale(1.05); }

        .tp-card-vehicle-badge {
          position: absolute;
          top: 10px; left: 12px;
          background: rgba(255,255,255,0.93);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 13px;
          font-weight: 600;
          color: #14532d;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }

        .tp-card-body {
          padding: 16px;
        }

        .tp-card-route {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .tp-card-location {
          font-weight: 600;
          color: #111827;
          font-size: 13px;
        }

        .tp-card-arrow {
          color: #16a34a;
          font-weight: 700;
          flex-shrink: 0;
        }

        .tp-card-crop-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
        }

        .tp-card-crop {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          color: #14532d;
        }

        .tp-card-date {
          font-size: 11px;
          color: #9ca3af;
          margin-left: auto;
        }

        .tp-card-footer {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
        }

        .tp-card-select {
          flex: 1;
          padding: 8px 10px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #374151;
          background: #fafafa;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }

        .tp-card-select:focus { border-color: #16a34a; }

        .tp-remove-btn {
          background: #fff;
          border: 1.5px solid #fecaca;
          color: #ef4444;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .tp-remove-btn:hover { background: #fef2f2; }

        .tp-empty {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
          grid-column: 1/-1;
        }

        .tp-empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

        /* Toast */
        .tp-toast {
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

        .tp-toast.error { background: #dc2626; }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {toast && (
        <div className={`tp-toast ${toast.type === "error" ? "error" : ""}`}>{toast.msg}</div>
      )}

      <div className="tp-root">
        {/* Hero */}
        <div className="tp-hero">
          <h1 className="tp-hero-title">Transport Management</h1>
          <p className="tp-hero-sub">Track and manage all crop deliveries in real-time</p>
          <div className="tp-stats-row">
            {[
              { num: stats.total, label: "Total Orders" },
              { num: stats.dispatched, label: "Dispatched" },
              { num: stats.onWay, label: "On the Way" },
              { num: stats.delivered, label: "Delivered" },
            ].map((s, i) => (
              <div className="tp-stat-chip" key={i}>
                <span className="tp-stat-num">{s.num}</span>
                <span className="tp-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tp-body">
          {/* Add Order Form */}
          <div className="tp-form-card">
            <h3 className="tp-form-title">🚛 Add Transport Order</h3>
            <div className="tp-form-grid">
              <div className="tp-field-group">
                <label className="tp-label">Crop Name</label>
                <input className="tp-input" placeholder="e.g. Rice" value={crop} onChange={e => setCrop(e.target.value)} />
              </div>
              <div className="tp-field-group">
                <label className="tp-label">From</label>
                <input className="tp-input" placeholder="Origin city" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div className="tp-field-group">
                <label className="tp-label">Destination</label>
                <input className="tp-input" placeholder="Destination city" value={to} onChange={e => setTo(e.target.value)} />
              </div>
              <div className="tp-field-group">
                <label className="tp-label">Vehicle</label>
                <select className="tp-select" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                  <option>Truck</option>
                  <option>Mini Van</option>
                  <option>Pickup</option>
                </select>
              </div>
            </div>
            <button className="tp-btn-add" onClick={addOrder}>+ Add Order</button>
          </div>

          {/* Filter + Cards */}
          <div className="tp-filter-bar">
            <h2 className="tp-filter-title">📦 Active Orders</h2>
            <div className="tp-filter-pills">
              {["All", "Dispatched", "On the Way", "Delivered"].map(s => (
                <button key={s} className={`tp-pill ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="tp-cards-grid">
            {filtered.length === 0 ? (
              <div className="tp-empty">
                <span className="tp-empty-icon">🚚</span>
                <p>No orders with status "{filterStatus}"</p>
              </div>
            ) : (
              filtered.map((order) => {
                const vc = vehicleConfig[order.vehicle] || vehicleConfig.Truck;
                const sc = statusConfig[order.status] || statusConfig.Dispatched;
                const emoji = cropEmojis[order.crop] || "🌿";
                return (
                  <div className="tp-order-card" key={order.id}>
                    <div className="tp-card-img-wrap">
                      <img src={vc.image} alt={order.vehicle} className="tp-card-img" />
                      <div className="tp-card-vehicle-badge">
                        {vc.emoji} {order.vehicle}
                      </div>
                    </div>
                    <div className="tp-card-body">
                      <div className="tp-card-crop-row">
                        <span style={{ fontSize: 18 }}>{emoji}</span>
                        <span className="tp-card-crop">{order.crop}</span>
                        {order.date && <span className="tp-card-date">{order.date}</span>}
                      </div>
                      <div className="tp-card-route">
                        <span className="tp-card-location">{order.from}</span>
                        <span className="tp-card-arrow">→</span>
                        <span className="tp-card-location">{order.to}</span>
                      </div>
                      <div className="tp-card-footer">
                        <span
                          className="tp-status-badge"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {sc.icon} {order.status}
                        </span>
                        <select
                          className="tp-card-select"
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          defaultValue="Change Status"
                        >
                          <option disabled>Change Status</option>
                          <option>Dispatched</option>
                          <option>On the Way</option>
                          <option>Delivered</option>
                        </select>
                        <button className="tp-remove-btn" onClick={() => removeOrder(order.id)}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}