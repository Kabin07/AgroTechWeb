import React, { useState } from "react";

const statusConfig = {
  Delivered: {
    color: "#16a34a",
    bg: "#dcfce7",
    icon: "✓",
    label: "Delivered",
  },
  Shipped: {
    color: "#d97706",
    bg: "#fef3c7",
    icon: "⟳",
    label: "Shipped",
  },
  Pending: {
    color: "#2563eb",
    bg: "#dbeafe",
    icon: "◷",
    label: "Pending",
  },
};

const dummyOrders = [
  {
    crop: "Rice",
    buyerName: "Buyer A",
    farmerName: "Farmer Kumar",
    status: "Delivered",
    quantity: "50 kg",
    date: "Apr 05, 2026",
  },
  {
    crop: "Wheat",
    buyerName: "Buyer B",
    farmerName: "Farmer Ravi",
    status: "Shipped",
    quantity: "30 kg",
    date: "Apr 06, 2026",
  },
];

const cropEmojis = {
  Rice: "🌾",
  Wheat: "🌿",
  Corn: "🌽",
  Tomato: "🍅",
  Potato: "🥔",
};

export default function HistoryPanel({ orders }) {
  const [isOpen, setIsOpen] = useState(true);
  const allOrders = [...dummyOrders, ...(orders || [])];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        .hp-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 340px;
          font-family: 'DM Sans', sans-serif;
          z-index: 1000;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hp-toggle-btn {
          position: absolute;
          top: -42px;
          right: 0;
          background: linear-gradient(135deg, #166534, #15803d);
          color: #fff;
          border: none;
          border-radius: 10px 10px 0 0;
          padding: 8px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }

        .hp-badge {
          background: #fbbf24;
          color: #78350f;
          border-radius: 99px;
          padding: 1px 7px;
          font-size: 11px;
          font-weight: 700;
        }

        .hp-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08);
          overflow: hidden;
          transform-origin: bottom right;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          max-height: 400px;
          display: flex;
          flex-direction: column;
        }

        .hp-card.collapsed {
          max-height: 0;
          opacity: 0;
          pointer-events: none;
        }

        .hp-header {
          background: linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .hp-header-title {
          font-family: 'DM Serif Display', serif;
          font-size: 17px;
          color: #fff;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hp-header-count {
          background: rgba(255,255,255,0.2);
          color: #fff;
          border-radius: 99px;
          padding: 2px 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
        }

        .hp-scroll {
          overflow-y: auto;
          flex: 1;
          padding: 12px;
          scrollbar-width: thin;
          scrollbar-color: #bbf7d0 transparent;
        }

        .hp-scroll::-webkit-scrollbar { width: 4px; }
        .hp-scroll::-webkit-scrollbar-track { background: transparent; }
        .hp-scroll::-webkit-scrollbar-thumb { background: #bbf7d0; border-radius: 2px; }

        .hp-order-card {
          background: #f8fffe;
          border: 1px solid #e2f5ea;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }

        .hp-order-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(21, 128, 61, 0.1);
        }

        .hp-order-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--status-color);
          border-radius: 0 2px 2px 0;
        }

        .hp-crop-name {
          font-family: 'DM Serif Display', serif;
          font-size: 15px;
          color: #14532d;
          margin: 0 0 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hp-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 8px;
        }

        .hp-meta-row {
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .hp-meta-label {
          font-weight: 600;
          color: #374151;
          min-width: 52px;
        }

        .hp-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .hp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          background: var(--status-bg);
          color: var(--status-color);
        }

        .hp-date {
          font-size: 11px;
          color: #9ca3af;
        }

        .hp-empty {
          text-align: center;
          padding: 30px 20px;
          color: #9ca3af;
          font-size: 13px;
        }

        .hp-empty-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="hp-panel">
        <button className="hp-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          📦 History
          <span className="hp-badge">{allOrders.length}</span>
          {isOpen ? "▾" : "▴"}
        </button>

        <div className={`hp-card ${!isOpen ? "collapsed" : ""}`}>
          <div className="hp-header">
            <h5 className="hp-header-title">
              🛒 Purchase History
            </h5>
            <span className="hp-header-count">{allOrders.length} orders</span>
          </div>

          <div className="hp-scroll">
            {allOrders.length === 0 ? (
              <div className="hp-empty">
                <span className="hp-empty-icon">🌱</span>
                No orders yet
              </div>
            ) : (
              allOrders.map((order, index) => {
                const s = statusConfig[order.status] || statusConfig.Pending;
                const emoji = cropEmojis[order.crop] || "🌿";
                return (
                  <div
                    key={index}
                    className="hp-order-card"
                    style={{ "--status-color": s.color, "--status-bg": s.bg }}
                  >
                    <p className="hp-crop-name">
                      {emoji} {order.crop}
                      {order.quantity && (
                        <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                          · {order.quantity}
                        </span>
                      )}
                    </p>
                    <div className="hp-meta">
                      <span className="hp-meta-row">
                        <span className="hp-meta-label">Buyer</span> {order.buyerName}
                      </span>
                      <span className="hp-meta-row">
                        <span className="hp-meta-label">Farmer</span> {order.farmerName || "—"}
                      </span>
                    </div>
                    <div className="hp-footer-row">
                      <span className="hp-status-badge">
                        {s.icon} {order.status}
                      </span>
                      {order.date && <span className="hp-date">{order.date}</span>}
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