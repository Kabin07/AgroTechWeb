// Supabase implementation of the backend interface (same methods as localBackend).
// Reads use RLS-protected tables; multi-step writes use SQL functions (RPC).

import { BackendError, ERROR_CODES } from "./errors";

const PROFILE_FIELDS = "id, full_name, role, preferred_language, state, district, village";

function check({ data, error }) {
  if (error) {
    const msg = error.message || "";
    const code = ERROR_CODES.find((c) => msg.includes(c));
    throw new BackendError(code || "unknown", msg);
  }
  return data;
}

export function createSupabaseBackend(supabase) {
  let cachedUserId = null;

  async function userId() {
    if (cachedUserId) return cachedUserId;
    const { data } = await supabase.auth.getSession();
    cachedUserId = data.session?.user?.id || null;
    return cachedUserId;
  }

  async function loadProfile(user) {
    if (!user) return null;
    const profile = check(await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", user.id).maybeSingle());
    const contact = check(await supabase.from("profile_contacts").select("phone").eq("id", user.id).maybeSingle());
    // The trigger creates the profile; fall back to auth metadata if it has not landed yet.
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      full_name: profile?.full_name || meta.full_name || user.email || user.phone || "",
      role: profile?.role || meta.role || "farmer",
      preferred_language: profile?.preferred_language || meta.preferred_language || "en",
      state: profile?.state || meta.state || "",
      district: profile?.district || meta.district || "",
      village: profile?.village || "",
      phone: contact?.phone || user.phone || meta.phone || "",
      email: user.email || "",
    };
  }

  return {
    mode: "supabase",

    // ── Auth ─────────────────────────────────────────────
    async getProfile() {
      const { data } = await supabase.auth.getSession();
      cachedUserId = data.session?.user?.id || null;
      return loadProfile(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cachedUserId = session?.user?.id || null;
        // Defer: Supabase recommends not awaiting other calls inside this callback.
        setTimeout(async () => {
          try {
            cb(await loadProfile(session?.user));
          } catch {
            cb(null);
          }
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signUpWithEmail({ email, password, fullName, role, phone = "", state = "", district = "", language = "en" }) {
      const res = check(
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role, phone, state, district, preferred_language: language },
          },
        })
      );
      return { needsConfirmation: !res.session };
    },
    async signInWithEmail({ email, password }) {
      check(await supabase.auth.signInWithPassword({ email, password }));
    },
    // Phone OTP needs an SMS provider (Twilio, MessageBird, Vonage…) enabled in Supabase Auth.
    async sendOtp({ phone, fullName, role, state = "", district = "", language = "en" }) {
      check(
        await supabase.auth.signInWithOtp({
          phone,
          options: { data: { full_name: fullName, role, phone, state, district, preferred_language: language } },
        })
      );
    },
    async verifyOtp({ phone, token }) {
      check(await supabase.auth.verifyOtp({ phone, token, type: "sms" }));
    },
    async signOut() {
      cachedUserId = null;
      check(await supabase.auth.signOut());
    },
    async updateProfile(patch) {
      const id = await userId();
      if (!id) throw new BackendError("not_logged_in");
      const { phone, ...rest } = patch;
      const allowed = ["full_name", "role", "preferred_language", "state", "district", "village"];
      const update = Object.fromEntries(Object.entries(rest).filter(([k]) => allowed.includes(k)));
      if (Object.keys(update).length) check(await supabase.from("profiles").update(update).eq("id", id));
      if (phone !== undefined) check(await supabase.from("profile_contacts").upsert({ id, phone }));
      const { data } = await supabase.auth.getUser();
      return loadProfile(data.user);
    },

    // ── Listings ─────────────────────────────────────────
    async listListings() {
      const rows = check(
        await supabase
          .from("crop_listings")
          .select("*, farmer:profiles!crop_listings_farmer_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(200)
      );
      return rows.map(({ farmer, ...l }) => ({ ...l, quantity_kg: Number(l.quantity_kg), price_per_kg: Number(l.price_per_kg), farmer_name: farmer?.full_name || "—" }));
    },
    async createListing({ crop, quantity_kg, price_per_kg, quality_grade = "B", location = "", notes = "" }) {
      const id = await userId();
      return check(
        await supabase
          .from("crop_listings")
          .insert({ farmer_id: id, crop, quantity_kg, price_per_kg, quality_grade, location, notes })
          .select()
          .single()
      );
    },
    async withdrawListing(listingId) {
      check(await supabase.from("crop_listings").update({ status: "withdrawn" }).eq("id", listingId));
    },

    // ── Buyer requests ───────────────────────────────────
    async listRequests() {
      const rows = check(
        await supabase
          .from("buyer_requests")
          .select("*, buyer:profiles!buyer_requests_buyer_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(200)
      );
      return rows.map(({ buyer, ...r }) => ({ ...r, quantity_kg: Number(r.quantity_kg), target_price_per_kg: r.target_price_per_kg && Number(r.target_price_per_kg), buyer_name: buyer?.full_name || "—" }));
    },
    async createRequest({ crop, quantity_kg, target_price_per_kg = null, location = "" }) {
      const id = await userId();
      return check(
        await supabase
          .from("buyer_requests")
          .insert({ buyer_id: id, crop, quantity_kg, target_price_per_kg: target_price_per_kg || null, location })
          .select()
          .single()
      );
    },
    async closeRequest(requestId) {
      check(await supabase.from("buyer_requests").update({ status: "closed" }).eq("id", requestId));
    },
    async acceptRequest(requestId, { price_per_kg, pickup_location = "" }) {
      return check(
        await supabase.rpc("accept_buyer_request", {
          p_request_id: requestId,
          p_price_per_kg: price_per_kg,
          p_pickup_location: pickup_location || null,
        })
      );
    },

    // ── Orders ───────────────────────────────────────────
    async listOrders() {
      const rows = check(
        await supabase
          .from("orders")
          .select("*, farmer:profiles!orders_farmer_id_fkey(full_name), buyer:profiles!orders_buyer_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(200)
      );
      return rows.map(({ farmer, buyer, ...o }) => ({
        ...o,
        quantity_kg: Number(o.quantity_kg),
        price_per_kg: Number(o.price_per_kg),
        total_amount: Number(o.total_amount),
        farmer_name: farmer?.full_name || "—",
        buyer_name: buyer?.full_name || "—",
      }));
    },
    async placeOrder(listingId, { quantity_kg, drop_location = "" }) {
      return check(
        await supabase.rpc("place_order", {
          p_listing_id: listingId,
          p_quantity_kg: quantity_kg,
          p_drop_location: drop_location || null,
        })
      );
    },
    async respondToOrder(orderId, accept) {
      return check(await supabase.rpc("respond_to_order", { p_order_id: orderId, p_accept: accept }));
    },

    // ── Transport ────────────────────────────────────────
    async listTransportJobs() {
      const rows = check(
        await supabase
          .from("transport_jobs")
          .select(
            "*, creator:profiles!transport_jobs_created_by_fkey(full_name), transporter:profiles!transport_jobs_transporter_id_fkey(full_name)"
          )
          .order("created_at", { ascending: false })
          .limit(200)
      );
      return rows.map(({ creator, transporter, ...j }) => ({
        ...j,
        quantity_kg: j.quantity_kg && Number(j.quantity_kg),
        distance_km: j.distance_km && Number(j.distance_km),
        estimated_cost: j.estimated_cost && Number(j.estimated_cost),
        created_by_name: creator?.full_name || "—",
        transporter_name: transporter?.full_name || null,
      }));
    },
    async createTransportJob(job) {
      const id = await userId();
      const { crop, quantity_kg, from_location, to_location, vehicle_type = "truck", distance_km = null, estimated_cost = null } = job;
      return check(
        await supabase
          .from("transport_jobs")
          .insert({ created_by: id, crop, quantity_kg: quantity_kg || null, from_location, to_location, vehicle_type, distance_km: distance_km || null, estimated_cost: estimated_cost || null })
          .select()
          .single()
      );
    },
    async claimTransportJob(jobId) {
      return check(await supabase.rpc("claim_transport_job", { p_job_id: jobId }));
    },
    async advanceTransportJob(jobId) {
      return check(await supabase.rpc("advance_transport_job", { p_job_id: jobId }));
    },
    async cancelTransportJob(jobId) {
      check(await supabase.rpc("cancel_transport_job", { p_job_id: jobId }));
    },

    async getOrderContacts(orderId) {
      return check(await supabase.rpc("get_order_contacts", { p_order_id: orderId }));
    },

    // Realtime: any change to marketplace tables triggers a refresh in the UI.
    subscribe(cb) {
      const channel = supabase.channel(`agrotech-${Math.random().toString(36).slice(2)}`);
      ["crop_listings", "buyer_requests", "orders", "transport_jobs"].forEach((table) => {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => cb(table));
      });
      channel.subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}
