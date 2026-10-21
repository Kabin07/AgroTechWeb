import fs from "fs";
import path from "path";
import { DICTIONARIES, translate } from "./index";
import en from "./translations/en";

// Keys built at runtime, e.g. t(`status_${status}`)
const DYNAMIC = [
  ...["available", "sold", "withdrawn", "open", "accepted", "closed", "pending", "in_transit", "delivered", "cancelled", "requested", "assigned"].map((s) => `status_${s}`),
  ...["not_found", "not_allowed", "not_enough_quantity", "invalid_state", "own_listing", "invalid_input", "not_logged_in"].map((c) => `err_${c}`),
  "conf_high", "conf_medium", "conf_low", "priceIn7", "priceIn15", "priceIn30",
  "priceTrend_up", "priceTrend_down", "priceTrend_flat", "qualityA", "qualityB", "qualityC",
  "source_live", "source_cache", "source_reference", "vehicle_pickup", "vehicle_mini_truck", "vehicle_truck",
  "farmer", "buyer", "transporter", "goToPrices", "goToSell", "goToBuy", "goToTransport",
  // success messages passed to act(fn, "key")
  "farmerRequestAccepted", "farmerOrderAccepted", "farmerOrderRejected", "farmerWithdrawn",
  "buyerPosted", "buyerOrderPlaced", "transportRequested", "transportClaimed", "transportUpdated",
];

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === "translations" ? [] : sourceFiles(p);
    return /\.js$/.test(d.name) && !/\.test\.js$/.test(d.name) ? [p] : [];
  });
}

describe("translations", () => {
  const enKeys = Object.keys(en).sort();

  test.each(Object.keys(DICTIONARIES))("%s has exactly the English keys", (code) => {
    expect(Object.keys(DICTIONARIES[code]).sort()).toEqual(enKeys);
  });

  test.each(Object.keys(DICTIONARIES))("%s keeps every {placeholder}", (code) => {
    const dict = DICTIONARIES[code];
    enKeys.forEach((key) => {
      const wanted = (en[key].match(/\{\w+\}/g) || []).sort();
      const got = (dict[key].match(/\{\w+\}/g) || []).sort();
      expect({ key, got }).toEqual({ key, got: wanted });
    });
  });

  test("every key used in the code exists", () => {
    const used = new Set(DYNAMIC);
    const srcDir = path.join(__dirname, "..");
    sourceFiles(srcDir).forEach((file) => {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)) used.add(m[1]);
      for (const m of text.matchAll(/translate\(lang, "([A-Za-z0-9_]+)"/g)) used.add(m[1]);
    });
    const missing = [...used].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  test("translate fills placeholders and falls back to English", () => {
    expect(translate("hi", "welcomeUser", { name: "Ravi" })).toBe("नमस्ते, Ravi");
    expect(translate("xx", "navHome")).toBe("Home");
  });
});
