import { createLocalBackend } from "./localBackend";

function memoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

// Two "tabs" sharing one database but with separate sessions.
function setup() {
  const storage = memoryStorage();
  const tab = () => createLocalBackend({ storage, session: memoryStorage(), win: {} });
  return { farmerTab: tab(), buyerTab: tab(), truckTab: tab() };
}

test("full flow: list → order → accept → transport → delivered", async () => {
  const { farmerTab, buyerTab, truckTab } = setup();
  await farmerTab.demoLogin({ fullName: "Asha", role: "farmer" });
  await buyerTab.demoLogin({ fullName: "Mandi Traders", role: "buyer" });
  await truckTab.demoLogin({ fullName: "Raju Transport", role: "transporter" });

  const listing = await farmerTab.createListing({ crop: "onion", quantity_kg: 1000, price_per_kg: 18, location: "Nashik" });
  expect((await buyerTab.listListings()).some((l) => l.id === listing.id && l.farmer_name === "Asha")).toBe(true);

  await expect(buyerTab.placeOrder(listing.id, { quantity_kg: 5000 })).rejects.toMatchObject({ code: "not_enough_quantity" });
  await expect(farmerTab.placeOrder(listing.id, { quantity_kg: 10 })).rejects.toMatchObject({ code: "own_listing" });

  const order = await buyerTab.placeOrder(listing.id, { quantity_kg: 400, drop_location: "Pune" });
  expect(order.status).toBe("pending");
  expect(order.total_amount).toBe(7200);
  expect((await farmerTab.listListings()).find((l) => l.id === listing.id).quantity_kg).toBe(600);

  await expect(buyerTab.respondToOrder(order.id, true)).rejects.toMatchObject({ code: "not_allowed" });
  await farmerTab.respondToOrder(order.id, true);

  const jobs = await truckTab.listTransportJobs();
  const job = jobs.find((j) => j.order_id === order.id);
  expect(job).toMatchObject({ status: "requested", from_location: "Nashik", to_location: "Pune" });

  await expect(buyerTab.claimTransportJob(job.id)).rejects.toMatchObject({ code: "not_allowed" });
  await truckTab.claimTransportJob(job.id);
  await truckTab.advanceTransportJob(job.id);
  expect((await buyerTab.listOrders()).find((o) => o.id === order.id).status).toBe("in_transit");
  await truckTab.advanceTransportJob(job.id);
  expect((await buyerTab.listOrders()).find((o) => o.id === order.id).status).toBe("delivered");
  await expect(truckTab.advanceTransportJob(job.id)).rejects.toMatchObject({ code: "invalid_state" });

  const contacts = await buyerTab.getOrderContacts(order.id);
  expect(contacts.map((c) => c.role).sort()).toEqual(["farmer", "transporter"]);
});

test("rejecting an order returns the quantity", async () => {
  const { farmerTab, buyerTab } = setup();
  await farmerTab.demoLogin({ fullName: "Asha", role: "farmer" });
  await buyerTab.demoLogin({ fullName: "Mandi Traders", role: "buyer" });
  const listing = await farmerTab.createListing({ crop: "wheat", quantity_kg: 100, price_per_kg: 25 });
  const order = await buyerTab.placeOrder(listing.id, { quantity_kg: 100 });
  expect((await farmerTab.listListings()).find((l) => l.id === listing.id).status).toBe("sold");
  await farmerTab.respondToOrder(order.id, false);
  const after = (await farmerTab.listListings()).find((l) => l.id === listing.id);
  expect(after).toMatchObject({ status: "available", quantity_kg: 100 });
});

test("farmer accepts a buyer request", async () => {
  const { farmerTab, buyerTab } = setup();
  await farmerTab.demoLogin({ fullName: "Asha", role: "farmer" });
  await buyerTab.demoLogin({ fullName: "Mandi Traders", role: "buyer" });
  const req = await buyerTab.createRequest({ crop: "potato", quantity_kg: 300, target_price_per_kg: 15, location: "Chennai" });
  const order = await farmerTab.acceptRequest(req.id, { price_per_kg: 16, pickup_location: "Hosur" });
  expect(order).toMatchObject({ status: "accepted", quantity_kg: 300, price_per_kg: 16 });
  expect((await buyerTab.listRequests()).find((r) => r.id === req.id).status).toBe("accepted");
  await expect(farmerTab.acceptRequest(req.id, { price_per_kg: 16 })).rejects.toMatchObject({ code: "invalid_state" });
});

test("validation and auth", async () => {
  const { farmerTab } = setup();
  await expect(farmerTab.createListing({ crop: "onion", quantity_kg: 1, price_per_kg: 1 })).rejects.toMatchObject({ code: "not_logged_in" });
  await farmerTab.demoLogin({ fullName: "Asha", role: "farmer" });
  await expect(farmerTab.createListing({ crop: "onion", quantity_kg: -5, price_per_kg: 10 })).rejects.toMatchObject({ code: "invalid_input" });
  expect((await farmerTab.getProfile()).full_name).toBe("Asha");
  await farmerTab.signOut();
  expect(await farmerTab.getProfile()).toBe(null);
});
