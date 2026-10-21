// Approximate road-freight costs for farm produce in India.
// These are planning estimates (2026 rates), not quotes. Adjust in one place here.

export const VEHICLES = {
  pickup: { id: "pickup", emoji: "🛻", capacityKg: 1500, ratePerKm: 18, baseFare: 500 },
  mini_truck: { id: "mini_truck", emoji: "🚐", capacityKg: 3000, ratePerKm: 26, baseFare: 800 },
  truck: { id: "truck", emoji: "🚛", capacityKg: 10000, ratePerKm: 42, baseFare: 1500 },
};

const LOADING_PER_KG = 0.3; // loading + unloading labour, ₹ per kg

export function suggestVehicle(quantityKg) {
  const qty = Number(quantityKg) || 0;
  if (qty <= VEHICLES.pickup.capacityKg) return "pickup";
  if (qty <= VEHICLES.mini_truck.capacityKg) return "mini_truck";
  return "truck";
}

export function estimateTransportCost({ distanceKm, quantityKg, vehicle }) {
  const distance = Math.max(0, Number(distanceKm) || 0);
  const qty = Math.max(0, Number(quantityKg) || 0);
  const v = VEHICLES[vehicle] || VEHICLES[suggestVehicle(qty)];
  if (!distance || !qty) return { vehicle: v.id, trips: 0, cost: 0, perKg: 0 };
  const trips = Math.max(1, Math.ceil(qty / v.capacityKg));
  const cost = Math.round(trips * (v.baseFare + v.ratePerKm * distance) + qty * LOADING_PER_KG);
  return { vehicle: v.id, trips, cost, perKg: round2(cost / qty) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
