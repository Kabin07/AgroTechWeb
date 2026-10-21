import { findCrop, parseIntent } from "./intent";

describe("parseIntent", () => {
  test.each([
    ["tomato price today", "price", "tomato"],
    ["What is the rate of onions?", "price", "onion"],
    ["टमाटर का भाव क्या है", "price", "tomato"],
    ["இன்று வெங்காயம் விலை என்ன", "price", "onion"],
    ["ఉల్లిపాయ ధర ఎంత", "price", "onion"],
    ["ಈರುಳ್ಳಿ ಬೆಲೆ ಎಷ್ಟು", "price", "onion"],
    ["തക്കാളി വില എത്ര", "price", "tomato"],
    ["कांद्याचा दर काय आहे", "price", "onion"],
    ["আলুর দাম কত", "price", "potato"],
    ["gehu", "price", "wheat"],
    ["book a truck", "transport", null],
    ["मुझे ट्रक चाहिए", "transport", null],
    ["I want to buy rice", "buy", "paddy"],
    ["namaste", "greeting", null],
    ["help", "help", null],
    ["blah blah", "unknown", null],
  ])("%s → %s / %s", (text, intent, cropId) => {
    const r = parseIntent(text);
    expect(r.intent).toBe(intent);
    expect(r.cropId).toBe(cropId);
  });

  test("extracts quantity and price when selling", () => {
    expect(parseIntent("sell 500 kg tomato at 20 rupees")).toMatchObject({ intent: "sell", cropId: "tomato", quantityKg: 500, pricePerKg: 20 });
    expect(parseIntent("मुझे 5 क्विंटल गेहूं बेचना है 26 रुपये")).toMatchObject({ intent: "sell", cropId: "wheat", quantityKg: 500, pricePerKg: 26 });
    expect(parseIntent("500 கிலோ தக்காளி 20 ரூபாய் விற்க வேண்டும்")).toMatchObject({ intent: "sell", cropId: "tomato", quantityKg: 500, pricePerKg: 20 });
    expect(parseIntent("2 ton onion")).toMatchObject({ cropId: "onion", quantityKg: 2000 });
  });

  test("understands native digits and plain numbers", () => {
    expect(parseIntent("५०० किलो आलू")).toMatchObject({ cropId: "potato", quantityKg: 500 });
    expect(parseIntent("sell potato 300 15")).toMatchObject({ quantityKg: 300, pricePerKg: 15 });
  });

  test("does not confuse similar words", () => {
    expect(findCrop("turmeric")).toBe("turmeric");
    expect(findCrop("price")).toBe(null);
    expect(findCrop("tur dal")).toBe("tur");
  });
});
