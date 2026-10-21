// Demo backend that runs entirely in the browser.
// - Database: localStorage (shared by all tabs on this device)
// - Session: sessionStorage (each tab can be a different user, e.g. farmer + buyer)
// - "Realtime": the browser's storage event notifies other tabs of changes
// It mirrors the rules of the Supabase SQL functions so the UI behaves the same.

import { fail } from "./errors";

const DB_KEY = "agrotech.db.v1";
const SESSION_KEY = "agrotech.session.v1";

const ORDER_FLOW = { requested: "assigned", assigned: "in_transit", in_transit: "delivered" };

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function seed(now) {
  const t = (minutesAgo) => new Date(now.getTime() - minutesAgo * 60000).toISOString();
  const users = [
    { id: "demo-farmer-ravi", full_name: "Ravi Kumar", role: "farmer", preferred_language: "ta", state: "Tamil Nadu", district: "Salem", phone: "9800000001" },
    { id: "demo-farmer-lakshmi", full_name: "Lakshmi Devi", role: "farmer", preferred_language: "te", state: "Andhra Pradesh", district: "Kurnool", phone: "9800000002" },
    { id: "demo-farmer-suresh", full_name: "Suresh Patil", role: "farmer", preferred_language: "mr", state: "Maharashtra", district: "Nashik", phone: "9800000003" },
    { id: "demo-buyer-freshmart", full_name: "FreshMart Chennai", role: "buyer", preferred_language: "en", state: "Tamil Nadu", district: "Chennai", phone: "9800000004" },
  ];
  return {
    users,
    listings: [
      { id: uid(), farmer_id: "demo-farmer-ravi", crop: "tomato", quality_grade: "A", quantity_kg: 800, price_per_kg: 22, location: "Salem, Tamil Nadu", notes: "", status: "available", created_at: t(90) },
      { id: uid(), farmer_id: "demo-farmer-lakshmi", crop: "onion", quality_grade: "B", quantity_kg: 1500, price_per_kg: 18, location: "Kurnool, Andhra Pradesh", notes: "", status: "available", created_at: t(60) },
      { id: uid(), farmer_id: "demo-farmer-suresh", crop: "wheat", quality_grade: "B", quantity_kg: 2000, price_per_kg: 26, location: "Nashik, Maharashtra", notes: "", status: "available", created_at: t(30) },
    ],
    requests: [
      { id: uid(), buyer_id: "demo-buyer-freshmart", crop: "potato", quantity_kg: 500, target_price_per_kg: 16, location: "Chennai, Tamil Nadu", status: "open", accepted_by: null, created_at: t(45) },
    ],
    orders: [],
    jobs: [],
  };
}

export function createLocalBackend({ storage, session, now = () => new Date(), win } = {}) {
  const store = storage || window.localStorage;
  const sess = session || window.sessionStorage;
  const w = win || (typeof window !== "undefined" ? window : null);
  const listeners = new Set();
  const authListeners = new Set();

  function load() {
    try {
      const raw = store.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* corrupted: reseed */
    }
    const db = seed(now());
    store.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }

  function commit(db) {
    store.setItem(DB_KEY, JSON.stringify(db));
    listeners.forEach((cb) => cb());
  }

  if (w && w.addEventListener) {
    w.addEventListener("storage", (e) => {
      if (e.key === DB_KEY) listeners.forEach((cb) => cb());
    });
  }

  function currentUserId() {
    return sess.getItem(SESSION_KEY);
  }

  function me(db) {
    const id = currentUserId();
    const user = id && db.users.find((u) => u.id === id);
    if (!user) fail("not_logged_in");
    return user;
  }

  const nameOf = (db, id) => db.users.find((u) => u.id === id)?.full_name || "—";
  const roleOf = (db, id) => db.users.find((u) => u.id === id)?.role;
  const stamp = () => now().toISOString();

  function positive(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) fail("invalid_input");
    return v;
  }

  function createJobForOrder(db, order, vehicle = "truck") {
    db.jobs.push({
      id: uid(),
      order_id: order.id,
      created_by: order.farmer_id,
      transporter_id: null,
      crop: order.crop,
      quantity_kg: order.quantity_kg,
      from_location: order.pickup_location || "—",
      to_location: order.drop_location || "—",
      vehicle_type: vehicle,
      distance_km: null,
      estimated_cost: null,
      status: "requested",
      created_at: stamp(),
      updated_at: stamp(),
    });
  }

  const api = {
    mode: "local",

    // ── Auth ─────────────────────────────────────────────
    async getProfile() {
      const db = load();
      const id = currentUserId();
      return (id && db.users.find((u) => u.id === id)) || null;
    },
    onAuthChange(cb) {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    async demoLogin({ fullName, role, phone = "", state = "", district = "", language = "en" }) {
      if (!fullName?.trim() || !["farmer", "buyer", "transporter"].includes(role)) fail("invalid_input");
      const db = load();
      let user = db.users.find((u) => u.full_name.toLowerCase() === fullName.trim().toLowerCase() && u.role === role);
      if (!user) {
        user = { id: uid(), full_name: fullName.trim(), role, phone, state, district, preferred_language: language };
        db.users.push(user);
        commit(db);
      }
      sess.setItem(SESSION_KEY, user.id);
      authListeners.forEach((cb) => cb(user));
      return user;
    },
    async signOut() {
      sess.removeItem(SESSION_KEY);
      authListeners.forEach((cb) => cb(null));
    },
    async updateProfile(patch) {
      const db = load();
      const user = me(db);
      Object.assign(user, patch, { id: user.id });
      commit(db);
      authListeners.forEach((cb) => cb(user));
      return user;
    },

    // ── Listings ─────────────────────────────────────────
    async listListings() {
      const db = load();
      const id = currentUserId();
      return db.listings
        .filter((l) => l.status === "available" || l.farmer_id === id)
        .map((l) => ({ ...l, farmer_name: nameOf(db, l.farmer_id) }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    async createListing({ crop, quantity_kg, price_per_kg, quality_grade = "B", location = "", notes = "" }) {
      const db = load();
      const user = me(db);
      if (!crop) fail("invalid_input");
      const listing = {
        id: uid(), farmer_id: user.id, crop,
        quantity_kg: positive(quantity_kg), price_per_kg: positive(price_per_kg),
        quality_grade, location, notes, status: "available", created_at: stamp(),
      };
      db.listings.push(listing);
      commit(db);
      return listing;
    },
    async withdrawListing(id) {
      const db = load();
      const user = me(db);
      const l = db.listings.find((x) => x.id === id);
      if (!l) fail("not_found");
      if (l.farmer_id !== user.id) fail("not_allowed");
      l.status = "withdrawn";
      commit(db);
    },

    // ── Buyer requests ───────────────────────────────────
    async listRequests() {
      const db = load();
      const id = currentUserId();
      return db.requests
        .filter((r) => r.status === "open" || r.buyer_id === id || r.accepted_by === id)
        .map((r) => ({ ...r, buyer_name: nameOf(db, r.buyer_id) }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    async createRequest({ crop, quantity_kg, target_price_per_kg = null, location = "" }) {
      const db = load();
      const user = me(db);
      if (!crop) fail("invalid_input");
      const req = {
        id: uid(), buyer_id: user.id, crop, quantity_kg: positive(quantity_kg),
        target_price_per_kg: target_price_per_kg ? positive(target_price_per_kg) : null,
        location, status: "open", accepted_by: null, created_at: stamp(),
      };
      db.requests.push(req);
      commit(db);
      return req;
    },
    async closeRequest(id) {
      const db = load();
      const user = me(db);
      const r = db.requests.find((x) => x.id === id);
      if (!r) fail("not_found");
      if (r.buyer_id !== user.id) fail("not_allowed");
      if (r.status !== "open") fail("invalid_state");
      r.status = "closed";
      commit(db);
    },
    async acceptRequest(id, { price_per_kg, pickup_location = "" }) {
      const db = load();
      const user = me(db);
      const r = db.requests.find((x) => x.id === id);
      if (!r) fail("not_found");
      if (r.status !== "open") fail("invalid_state");
      if (r.buyer_id === user.id) fail("own_listing");
      const order = {
        id: uid(), listing_id: null, request_id: r.id, farmer_id: user.id, buyer_id: r.buyer_id,
        crop: r.crop, quantity_kg: r.quantity_kg, price_per_kg: positive(price_per_kg),
        pickup_location, drop_location: r.location, status: "accepted",
        created_at: stamp(), updated_at: stamp(),
      };
      order.total_amount = Math.round(order.quantity_kg * order.price_per_kg * 100) / 100;
      r.status = "accepted";
      r.accepted_by = user.id;
      db.orders.push(order);
      createJobForOrder(db, order);
      commit(db);
      return order;
    },

    // ── Orders ───────────────────────────────────────────
    async listOrders() {
      const db = load();
      const id = currentUserId();
      const myJobOrders = new Set(db.jobs.filter((j) => j.transporter_id === id).map((j) => j.order_id));
      return db.orders
        .filter((o) => o.farmer_id === id || o.buyer_id === id || myJobOrders.has(o.id))
        .map((o) => ({ ...o, farmer_name: nameOf(db, o.farmer_id), buyer_name: nameOf(db, o.buyer_id) }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    async placeOrder(listingId, { quantity_kg, drop_location = "" }) {
      const db = load();
      const user = me(db);
      const l = db.listings.find((x) => x.id === listingId);
      if (!l) fail("not_found");
      if (l.status !== "available") fail("invalid_state");
      if (l.farmer_id === user.id) fail("own_listing");
      const qty = positive(quantity_kg);
      if (qty > l.quantity_kg) fail("not_enough_quantity");
      const order = {
        id: uid(), listing_id: l.id, request_id: null, farmer_id: l.farmer_id, buyer_id: user.id,
        crop: l.crop, quantity_kg: qty, price_per_kg: l.price_per_kg,
        total_amount: Math.round(qty * l.price_per_kg * 100) / 100,
        pickup_location: l.location, drop_location, status: "pending",
        created_at: stamp(), updated_at: stamp(),
      };
      l.quantity_kg = Math.round((l.quantity_kg - qty) * 100) / 100;
      if (l.quantity_kg <= 0) l.status = "sold";
      db.orders.push(order);
      commit(db);
      return order;
    },
    async respondToOrder(orderId, accept) {
      const db = load();
      const user = me(db);
      const o = db.orders.find((x) => x.id === orderId);
      if (!o) fail("not_found");
      if (o.farmer_id !== user.id) fail("not_allowed");
      if (o.status !== "pending") fail("invalid_state");
      o.updated_at = stamp();
      if (accept) {
        o.status = "accepted";
        createJobForOrder(db, o);
      } else {
        o.status = "cancelled";
        const l = db.listings.find((x) => x.id === o.listing_id);
        if (l) {
          l.quantity_kg = Math.round((l.quantity_kg + o.quantity_kg) * 100) / 100;
          if (l.status === "sold") l.status = "available";
        }
      }
      commit(db);
      return o;
    },

    // ── Transport ────────────────────────────────────────
    async listTransportJobs() {
      const db = load();
      const id = currentUserId();
      const isTransporter = roleOf(db, id) === "transporter";
      const myOrders = new Set(db.orders.filter((o) => o.farmer_id === id || o.buyer_id === id).map((o) => o.id));
      return db.jobs
        .filter((j) => j.created_by === id || j.transporter_id === id || myOrders.has(j.order_id) || (isTransporter && j.status === "requested"))
        .map((j) => ({ ...j, created_by_name: nameOf(db, j.created_by), transporter_name: j.transporter_id ? nameOf(db, j.transporter_id) : null }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    async createTransportJob({ crop, quantity_kg, from_location, to_location, vehicle_type = "truck", distance_km = null, estimated_cost = null }) {
      const db = load();
      const user = me(db);
      if (!crop || !from_location || !to_location) fail("invalid_input");
      const job = {
        id: uid(), order_id: null, created_by: user.id, transporter_id: null, crop,
        quantity_kg: quantity_kg ? positive(quantity_kg) : null, from_location, to_location, vehicle_type,
        distance_km: distance_km ? Number(distance_km) : null, estimated_cost: estimated_cost ? Number(estimated_cost) : null,
        status: "requested", created_at: stamp(), updated_at: stamp(),
      };
      db.jobs.push(job);
      commit(db);
      return job;
    },
    async claimTransportJob(id) {
      const db = load();
      const user = me(db);
      if (user.role !== "transporter") fail("not_allowed");
      const j = db.jobs.find((x) => x.id === id);
      if (!j) fail("not_found");
      if (j.status !== "requested") fail("invalid_state");
      j.transporter_id = user.id;
      j.status = "assigned";
      j.updated_at = stamp();
      commit(db);
      return j;
    },
    async advanceTransportJob(id) {
      const db = load();
      const user = me(db);
      const j = db.jobs.find((x) => x.id === id);
      if (!j) fail("not_found");
      if (j.transporter_id !== user.id) fail("not_allowed");
      const next = ORDER_FLOW[j.status];
      if (!next || next === "assigned") fail("invalid_state");
      j.status = next;
      j.updated_at = stamp();
      const o = j.order_id && db.orders.find((x) => x.id === j.order_id);
      if (o && o.status !== "cancelled") {
        o.status = next;
        o.updated_at = stamp();
      }
      commit(db);
      return j;
    },
    async cancelTransportJob(id) {
      const db = load();
      const user = me(db);
      const j = db.jobs.find((x) => x.id === id);
      if (!j) fail("not_found");
      if (j.created_by !== user.id) fail("not_allowed");
      if (j.status !== "requested") fail("invalid_state");
      j.status = "cancelled";
      commit(db);
    },

    // ── Contact details for the other party of an order ──
    async getOrderContacts(orderId) {
      const db = load();
      const user = me(db);
      const o = db.orders.find((x) => x.id === orderId);
      if (!o) fail("not_found");
      const job = db.jobs.find((j) => j.order_id === orderId);
      const parties = [o.farmer_id, o.buyer_id, job?.transporter_id].filter(Boolean);
      if (!parties.includes(user.id)) fail("not_allowed");
      return parties
        .filter((pid) => pid !== user.id)
        .map((pid) => {
          const u = db.users.find((x) => x.id === pid);
          return { id: pid, full_name: u?.full_name, role: u?.role, phone: u?.phone || null };
        });
    },

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async resetDemoData() {
      store.removeItem(DB_KEY);
      load();
      listeners.forEach((cb) => cb());
    },
  };
  return api;
}
