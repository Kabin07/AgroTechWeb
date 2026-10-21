// Understands short farmer requests in English and 7 Indian languages, typed or spoken:
//   "tomato price", "टमाटर का भाव", "500 கிலோ வெங்காயம் விற்க வேண்டும்", "book a truck"
// Works offline (no AI needed). The AI assistant is used on top of this when available.

import { CROPS } from "../data/crops";

const INTENT_WORDS = {
  sell: ["sell", "selling", "sale", "bech", "bechna", "bechni", "vikri", "बेच", "बेचना", "बिक्री", "विक", "विक्री", "விற்க", "விற்பனை", "விக்க", "అమ్మ", "అమ్మకం", "ಮಾರಾಟ", "ಮಾರು", "ಮಾರಬೇಕು", "വിൽ", "വില്പന", "বিক্রি", "বেচ"],
  buy: ["buy", "buying", "purchase", "kharid", "khareed", "kharidna", "खरीद", "खरेदी", "வாங்க", "கொள்முதல்", "కొను", "కొనాలి", "కొనుగోలు", "ಖರೀದಿ", "ಕೊಳ್ಳ", "വാങ്ങ", "কিনতে", "কিনব", "কিনে", "ক্রয়"],
  transport: ["transport", "truck", "lorry", "vehicle", "tempo", "pickup", "gaadi", "gadi", "delivery", "गाड़ी", "गाडी", "ट्रक", "वाहन", "टेम्पो", "வண்டி", "லாரி", "வாகனம்", "போக்குவரத்து", "వాహనం", "లారీ", "రవాణా", "ಲಾರಿ", "ವಾಹನ", "ಸಾರಿಗೆ", "വണ്ടി", "ലോറി", "വാഹനം", "ഗതാഗത", "ট্রাক", "গাড়ি", "পরিবহন"],
  price: ["price", "prices", "rate", "rates", "bhav", "bhaav", "bhao", "daam", "kimat", "keemat", "mandi", "market", "worth", "भाव", "दाम", "कीमत", "क़ीमत", "रेट", "मंडी", "दर", "किंमत", "बाजारभाव", "விலை", "ரேட்", "மண்டி", "ధర", "రేటు", "మార్కెట్", "ಬೆಲೆ", "ದರ", "ರೇಟ್", "വില", "നിരക്ക്", "দাম", "দর", "মূল্য"],
  help: ["help", "madad", "sahayata", "how", "मदद", "सहायता", "कैसे", "मदत", "कसे", "உதவி", "எப்படி", "సహాయం", "సహాయ", "ఎలా", "ಸಹಾಯ", "ಹೇಗೆ", "സഹായ", "എങ്ങനെ", "সাহায্য", "কিভাবে", "কীভাবে"],
  greeting: ["hello", "hi", "hey", "namaste", "namaskar", "vanakkam", "नमस्ते", "नमस्कार", "வணக்கம்", "నమస్తే", "నమస్కారం", "ನಮಸ್ಕಾರ", "നമസ്കാരം", "নমস্কার", "হ্যালো"],
};

const UNIT_WORDS = {
  kg: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms", "किलो", "किलोग्राम", "कि.ग्रा", "கிலோ", "కిలో", "కిలోలు", "ಕೆಜಿ", "ಕಿಲೋ", "കിലോ", "কেজি", "কিলো"],
  quintal: ["quintal", "quintals", "qtl", "क्विंटल", "कुंतल", "குவிண்டால்", "క్వింటాల్", "క్వింటాళ్లు", "ಕ್ವಿಂಟಾಲ್", "ക്വിന്റൽ", "কুইন্টাল"],
  ton: ["ton", "tons", "tonne", "tonnes", "टन", "டன்", "టన్", "టన్నులు", "ಟನ್", "ടൺ", "টন"],
};
const UNIT_KG = { kg: 1, quintal: 100, ton: 1000 };

const RUPEE_WORDS = ["₹", "rs", "rs.", "rupee", "rupees", "rupaye", "rupay", "रुपये", "रुपए", "रुपया", "रु", "ரூபாய்", "ரூ", "రూపాయలు", "రూపాయి", "రూ", "ರೂಪಾಯಿ", "ರೂ", "രൂപ", "টাকা"];

// Native digit sets → ASCII (Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam)
const DIGIT_BLOCKS = [0x0966, 0x09e6, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];

function toAsciiDigits(text) {
  return text.replace(/[०-९০-৯௦-௯౦-౯೦-೯൦-൯]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = DIGIT_BLOCKS.find((b) => code >= b && code <= b + 9);
    return String(code - base);
  });
}

const isLatin = (word) => /^[a-z0-9 .₹]+$/i.test(word);

export function normalize(text) {
  return toAsciiDigits(String(text || ""))
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[!?,;:"'()[\]{}|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Latin words must match whole words (plural "s"/"es" allowed);
// Indian scripts match as substrings because suffixes attach to the word.
function containsWord(normalized, words, latinTokens) {
  return words.some((w) => {
    const word = w.toLowerCase();
    if (!isLatin(word)) return normalized.includes(word);
    if (word.includes(" ")) return ` ${normalized} `.includes(` ${word} `);
    return latinTokens.some((tok) => tok === word || tok === `${word}s` || tok === `${word}es` || (word.length >= 4 && tok.startsWith(word)));
  });
}

export function findCrop(text) {
  const normalized = normalize(text);
  const tokens = normalized.split(" ");
  let best = null;
  CROPS.forEach((crop) => {
    const candidates = [...crop.aliases, ...Object.values(crop.names), crop.id];
    candidates.forEach((alias) => {
      const a = alias.toLowerCase();
      if (containsWord(normalized, [a], tokens) && (!best || a.length > best.len)) best = { id: crop.id, len: a.length };
    });
  });
  return best?.id || null;
}

function unitAfter(rest) {
  const next = rest.trim().split(" ")[0] || "";
  for (const [unit, words] of Object.entries(UNIT_WORDS)) {
    if (words.some((w) => next === w || (!isLatin(w) && next.startsWith(w)))) return unit;
  }
  return null;
}

const isRupee = (token) => RUPEE_WORDS.some((w) => token === w || (!isLatin(w) && token.startsWith(w)));

function extractNumbers(normalized) {
  const spaced = normalized.replace(/(\d)([^\d\s.])/g, "$1 $2").replace(/₹\s*/g, "₹ ");
  const tokens = spaced.split(" ");
  const found = [];
  tokens.forEach((tok, i) => {
    if (!/^\d+(\.\d+)?$/.test(tok)) return;
    const value = Number(tok);
    const unit = unitAfter(tokens.slice(i + 1).join(" "));
    const rupee = isRupee(tokens[i + 1] || "") || isRupee(tokens[i - 1] || "");
    found.push({ value, unit, rupee });
  });
  return found;
}

export function parseIntent(text) {
  const normalized = normalize(text);
  const tokens = normalized.split(" ");
  const has = (intent) => containsWord(normalized, INTENT_WORDS[intent], tokens);
  const cropId = findCrop(normalized);

  const numbers = extractNumbers(normalized);
  let quantityKg = null;
  let pricePerKg = null;
  numbers.forEach((n) => {
    if (n.unit && quantityKg == null) quantityKg = n.value * UNIT_KG[n.unit];
    else if (n.rupee && pricePerKg == null) pricePerKg = n.value;
  });
  const plain = numbers.filter((n) => !n.unit && !n.rupee).map((n) => n.value);
  if (quantityKg == null && plain.length) quantityKg = plain.shift();
  if (pricePerKg == null && plain.length) pricePerKg = plain.shift();

  let intent = "unknown";
  if (has("sell") && !(has("price") && quantityKg == null)) intent = "sell";
  else if (has("buy")) intent = "buy";
  else if (has("transport")) intent = "transport";
  else if (has("price")) intent = "price";
  else if (cropId) intent = "price"; // just saying a crop name usually means "what's the rate?"
  else if (has("help")) intent = "help";
  else if (has("greeting")) intent = "greeting";

  return { intent, cropId, quantityKg, pricePerKg };
}
