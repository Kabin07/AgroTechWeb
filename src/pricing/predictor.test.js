import { analyzeHistory, estimateEarnings, predictPrice, seasonalIndex, suggestedPricePerKg } from "./predictor";
import { estimateTransportCost, suggestVehicle } from "./transportCost";
import { getCrop } from "../data/crops";

const asOf = new Date(2026, 9, 21); // 21 Oct 2026

function series(days, start, dailyChange) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(asOf);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d.toISOString().slice(0, 10), price: Math.round(start * Math.pow(1 + dailyChange, i)) };
  });
}

describe("predictPrice", () => {
  test("uses the median of today's markets and converts quintal → kg", () => {
    const records = [{ modal: 2000 }, { modal: 2200 }, { modal: 2400 }, { modal: 9000 }];
    const p = predictPrice({ cropId: "wheat", records, source: "live", asOf });
    expect(p.current.perQuintal).toBe(2300);
    expect(p.current.perKg).toBe(23);
    expect(p.forecasts.map((f) => f.days)).toEqual([7, 15, 30]);
    expect(p.source).toBe("live");
  });

  test("falls back to a seasonal reference estimate with low confidence", () => {
    const p = predictPrice({ cropId: "onion", asOf });
    expect(p.source).toBe("reference");
    expect(p.confidence).toBe("low");
    expect(p.current.perKg).toBeGreaterThan(5);
  });

  test("a rising history gives a rising forecast and 'wait' advice for storable crops", () => {
    const history = series(40, 2000, 0.01);
    const records = [{ modal: history[history.length - 1].price }];
    const p = predictPrice({ cropId: "wheat", history, records, source: "live", asOf });
    expect(p.forecasts[2].perKg).toBeGreaterThan(p.current.perKg);
    expect(p.trend).toBe("up");
    expect(p.advice.action).toBe("wait");
    expect(p.confidence).toBe("high");
  });

  test("perishable crops are never told to wait", () => {
    const history = series(40, 1000, 0.02);
    const p = predictPrice({ cropId: "tomato", history, records: [{ modal: history[39].price }], source: "live", asOf });
    expect(p.advice.perishable).toBe(true);
    expect(p.advice.action).toBe("sell_now");
  });

  test("trend is capped so a spike cannot predict absurd prices", () => {
    const history = series(20, 1000, 0.1);
    const p = predictPrice({ cropId: "potato", history, records: [{ modal: history[19].price }], source: "live", asOf });
    expect(p.forecasts[2].changePct).toBeLessThan(60);
  });

  test("flags prices below MSP", () => {
    const p = predictPrice({ cropId: "maize", records: [{ modal: 1800 }], source: "live", asOf });
    expect(p.advice.belowMsp).toBe(true);
    expect(p.msp.perKg).toBe(24);
  });

  test("forecast range contains the forecast", () => {
    const p = predictPrice({ cropId: "potato", records: [{ modal: 1500 }], source: "live", asOf });
    p.forecasts.forEach((f) => {
      expect(f.lowPerKg).toBeLessThanOrEqual(f.perKg);
      expect(f.highPerKg).toBeGreaterThanOrEqual(f.perKg);
    });
  });
});

test("seasonal index averages to 1 over the year", () => {
  const crop = getCrop("tomato");
  let sum = 0;
  for (let m = 0; m < 12; m++) sum += seasonalIndex(crop, new Date(2026, m, 15));
  expect(sum / 12).toBeCloseTo(1, 2);
});

test("analyzeHistory ignores thin data", () => {
  expect(analyzeHistory([{ date: "2026-10-20", price: 100 }], asOf, getCrop("wheat")).slope).toBe(0);
});

test("earnings and quality adjustments", () => {
  const p = predictPrice({ cropId: "wheat", records: [{ modal: 2500 }], source: "live", asOf });
  expect(suggestedPricePerKg(p, "A")).toBe(27);
  expect(suggestedPricePerKg(p, "C")).toBe(22);
  expect(estimateEarnings(p, { quantityKg: 1000, quality: "B", transportCost: 3000 })).toEqual({ pricePerKg: 25, gross: 25000, transport: 3000, net: 22000 });
});

test("transport cost picks a vehicle by load", () => {
  expect(suggestVehicle(800)).toBe("pickup");
  expect(suggestVehicle(2500)).toBe("mini_truck");
  expect(suggestVehicle(9000)).toBe("truck");
  const est = estimateTransportCost({ distanceKm: 100, quantityKg: 12000 });
  expect(est.vehicle).toBe("truck");
  expect(est.trips).toBe(2);
  expect(est.cost).toBe(2 * (1500 + 42 * 100) + 12000 * 0.3);
  expect(estimateTransportCost({ distanceKm: 0, quantityKg: 100 }).cost).toBe(0);
});
