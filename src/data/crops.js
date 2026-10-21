// Crop catalog shared by the marketplace, price prediction and voice/chat assistant.
//
// Prices are in ₹ per quintal (100 kg) because that is how Indian mandis
// (Agmarknet / data.gov.in) publish them. The UI converts to ₹ per kg.
//
// referencePrice: rough all-India modal price used only when live mandi data
//   is unavailable. It is clearly labelled as an estimate in the UI.
// season: relative price level for Jan..Dec (harvest months are cheaper).
// volatility: typical daily price movement (fraction), used for the forecast range.
// spoilage: fraction of value lost per day of storage on a small farm.
// msp: Government Minimum Support Price (₹/quintal). Update every season:
//   Kharif crops use KMS 2025-26, wheat uses RMS 2026-27.

export const CROPS = [
  {
    id: "paddy",
    emoji: "🌾",
    agmarknet: "Paddy(Dhan)(Common)",
    names: { en: "Rice (Paddy)", hi: "धान (चावल)", ta: "நெல் (அரிசி)", te: "వరి (ధాన్యం)", kn: "ಭತ್ತ (ಅಕ್ಕಿ)", ml: "നെല്ല് (അരി)", mr: "भात (धान)", bn: "ধান (চাল)" },
    aliases: ["rice", "paddy", "dhan", "chawal", "chaval", "nel", "nellu", "arisi", "vari", "bhatta", "akki", "bhaat", "धान", "चावल", "நெல்", "அரிசி", "వరి", "బియ్యం", "ಭತ್ತ", "ಅಕ್ಕಿ", "നെല്ല്", "അരി", "भात", "ধান", "চাল"],
    referencePrice: 2300,
    msp: 2369,
    mspLabel: "KMS 2025-26",
    season: [0.98, 0.99, 1.0, 1.0, 1.01, 1.02, 1.03, 1.03, 1.02, 0.97, 0.96, 0.98],
    volatility: 0.006,
    spoilage: 0.0005,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
  },
  {
    id: "wheat",
    emoji: "🌿",
    agmarknet: "Wheat",
    names: { en: "Wheat", hi: "गेहूं", ta: "கோதுமை", te: "గోధుమ", kn: "ಗೋಧಿ", ml: "ഗോതമ്പ്", mr: "गहू", bn: "গম" },
    aliases: ["wheat", "gehu", "gehun", "gahu", "godhumai", "godhuma", "godhi", "गेहूं", "गेहूँ", "கோதுமை", "గోధుమ", "ಗೋಧಿ", "ഗോതമ്പ്", "गहू", "गव्ह", "গম"],
    referencePrice: 2550,
    msp: 2585,
    mspLabel: "RMS 2026-27",
    season: [1.06, 1.08, 1.02, 0.94, 0.93, 0.96, 0.98, 1.0, 1.01, 1.02, 1.03, 1.05],
    volatility: 0.006,
    spoilage: 0.0005,
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80",
  },
  {
    id: "maize",
    emoji: "🌽",
    agmarknet: "Maize",
    names: { en: "Maize (Corn)", hi: "मक्का", ta: "மக்காச்சோளம்", te: "మొక్కజొన్న", kn: "ಮೆಕ್ಕೆಜೋಳ", ml: "ചോളം", mr: "मका", bn: "ভুট্টা" },
    aliases: ["maize", "corn", "makka", "makkai", "makai", "cholam", "mokkajonna", "mekkejola", "मक्का", "மக்காச்சோளம்", "சோளம்", "మొక్కజొన్న", "ಮೆಕ್ಕೆಜೋಳ", "ചോളം", "मका", "मक्या", "ভুট্টা"],
    referencePrice: 2200,
    msp: 2400,
    mspLabel: "KMS 2025-26",
    season: [1.0, 1.0, 0.98, 0.95, 0.97, 1.02, 1.06, 1.07, 1.04, 0.96, 0.95, 0.99],
    volatility: 0.008,
    spoilage: 0.0008,
    image: "https://images.unsplash.com/photo-1601593346740-925612772716?w=400&q=80",
  },
  {
    id: "tomato",
    emoji: "🍅",
    agmarknet: "Tomato",
    names: { en: "Tomato", hi: "टमाटर", ta: "தக்காளி", te: "టమాటా", kn: "ಟೊಮೆಟೊ", ml: "തക്കാളി", mr: "टोमॅटो", bn: "টমেটো" },
    aliases: ["tomato", "tomatoes", "tamatar", "tamator", "thakkali", "takkali", "tamata", "टमाटर", "தக்காளி", "టమాటా", "టమోటా", "ಟೊಮೆಟೊ", "ಟೊಮ್ಯಾಟೊ", "തക്കാളി", "टोमॅटो", "টমেটো"],
    referencePrice: 1800,
    msp: null,
    season: [0.75, 0.7, 0.72, 0.85, 1.0, 1.25, 1.45, 1.35, 1.05, 1.1, 1.0, 0.78],
    volatility: 0.05,
    spoilage: 0.04,
    image: "https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=400&q=80",
  },
  {
    id: "potato",
    emoji: "🥔",
    agmarknet: "Potato",
    names: { en: "Potato", hi: "आलू", ta: "உருளைக்கிழங்கு", te: "బంగాళాదుంప", kn: "ಆಲೂಗಡ್ಡೆ", ml: "ഉരുളക്കിഴങ്ങ്", mr: "बटाटा", bn: "আলু" },
    aliases: ["potato", "potatoes", "aloo", "alu", "urulai", "urulaikizhangu", "bangaladumpa", "aloogadde", "batata", "आलू", "உருளைக்கிழங்கு", "உருளை", "బంగాళాదుంప", "ಆಲೂಗಡ್ಡೆ", "ഉരുളക്കിഴങ്ങ്", "बटाटा", "बटाट्या", "আলু"],
    referencePrice: 1400,
    msp: null,
    season: [0.85, 0.78, 0.78, 0.85, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.2, 1.05],
    volatility: 0.025,
    spoilage: 0.003,
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80",
  },
  {
    id: "onion",
    emoji: "🧅",
    agmarknet: "Onion",
    names: { en: "Onion", hi: "प्याज", ta: "வெங்காயம்", te: "ఉల్లిపాయ", kn: "ಈರುಳ್ಳಿ", ml: "ഉള്ളി", mr: "कांदा", bn: "পেঁয়াজ" },
    aliases: ["onion", "onions", "pyaz", "pyaaz", "kanda", "vengayam", "ullipaya", "eerulli", "ulli", "प्याज", "प्याज़", "வெங்காயம்", "ఉల్లిపాయ", "ఉల్లి", "ಈರುಳ್ಳಿ", "ഉള്ളി", "कांदा", "कांद्या", "পেঁয়াজ"],
    referencePrice: 1600,
    msp: null,
    season: [0.95, 0.85, 0.78, 0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.25, 1.1],
    volatility: 0.035,
    spoilage: 0.003,
  },
  {
    id: "soybean",
    emoji: "🫘",
    agmarknet: "Soyabean",
    names: { en: "Soybean", hi: "सोयाबीन", ta: "சோயாபீன்", te: "సోయాబీన్", kn: "ಸೋಯಾಬೀನ್", ml: "സോയാബീൻ", mr: "सोयाबीन", bn: "সয়াবিন" },
    aliases: ["soybean", "soyabean", "soya", "सोयाबीन", "சோயாபீன்", "సోయాబీన్", "ಸೋಯಾಬೀನ್", "ಸೋಯಾ", "സോയാബീൻ", "সয়াবিন"],
    referencePrice: 4500,
    msp: 5328,
    mspLabel: "KMS 2025-26",
    season: [0.99, 1.0, 1.01, 1.02, 1.03, 1.04, 1.04, 1.03, 1.0, 0.94, 0.94, 0.97],
    volatility: 0.008,
    spoilage: 0.0005,
  },
  {
    id: "cotton",
    emoji: "☁️",
    agmarknet: "Cotton",
    names: { en: "Cotton", hi: "कपास", ta: "பருத்தி", te: "పత్తి", kn: "ಹತ್ತಿ", ml: "പരുത്തി", mr: "कापूस", bn: "তুলা" },
    aliases: ["cotton", "kapas", "paruthi", "patti", "pathi", "hatti", "kapus", "कपास", "பருத்தி", "పత్తి", "ಹತ್ತಿ", "പരുത്തി", "कापूस", "তুলা"],
    referencePrice: 7300,
    msp: 7710,
    mspLabel: "KMS 2025-26 (medium staple)",
    season: [0.97, 0.97, 0.99, 1.0, 1.02, 1.03, 1.04, 1.04, 1.02, 0.98, 0.97, 0.97],
    volatility: 0.007,
    spoilage: 0.0003,
  },
  {
    id: "groundnut",
    emoji: "🥜",
    agmarknet: "Groundnut",
    names: { en: "Groundnut", hi: "मूंगफली", ta: "நிலக்கடலை", te: "వేరుశనగ", kn: "ಕಡಲೆಕಾಯಿ", ml: "നിലക്കടല", mr: "शेंगदाणा", bn: "চিনাবাদাম" },
    aliases: ["groundnut", "peanut", "moongphali", "mungfali", "nilakadalai", "kadalai", "verusanaga", "palli", "kadalekai", "shengdana", "मूंगफली", "நிலக்கடலை", "கடலை", "వేరుశనగ", "ಕಡಲೆಕಾಯಿ", "നിലക്കടല", "शेंगदाणा", "भुईमूग", "চিনাবাদাম"],
    referencePrice: 6000,
    msp: 7263,
    mspLabel: "KMS 2025-26",
    season: [1.0, 1.01, 1.01, 1.0, 1.0, 1.02, 1.03, 1.03, 1.02, 0.97, 0.96, 0.97],
    volatility: 0.008,
    spoilage: 0.0008,
  },
  {
    id: "chilli",
    emoji: "🌶️",
    agmarknet: "Dry Chillies",
    names: { en: "Dry Chilli", hi: "सूखी लाल मिर्च", ta: "காய்ந்த மிளகாய்", te: "ఎండు మిర్చి", kn: "ಒಣ ಮೆಣಸಿನಕಾಯಿ", ml: "ഉണക്കമുളക്", mr: "सुकी मिरची", bn: "শুকনো লঙ্কা" },
    aliases: ["chilli", "chili", "chillies", "mirchi", "mirch", "milagai", "molagai", "mirapakaya", "menasinakai", "mulaku", "मिर्च", "मिर्ची", "மிளகாய்", "మిర్చి", "మిరప", "ಮೆಣಸಿನಕಾಯಿ", "ಮೆಣಸು", "മുളക്", "मिरची", "লঙ্কা", "মরিচ"],
    referencePrice: 13000,
    msp: null,
    season: [0.98, 0.92, 0.9, 0.92, 0.97, 1.0, 1.04, 1.07, 1.07, 1.06, 1.05, 1.02],
    volatility: 0.015,
    spoilage: 0.001,
  },
  {
    id: "turmeric",
    emoji: "🟡",
    agmarknet: "Turmeric",
    names: { en: "Turmeric", hi: "हल्दी", ta: "மஞ்சள்", te: "పసుపు", kn: "ಅರಿಶಿನ", ml: "മഞ്ഞൾ", mr: "हळद", bn: "হলুদ" },
    aliases: ["turmeric", "haldi", "manjal", "pasupu", "arishina", "arisina", "halad", "halud", "हल्दी", "மஞ்சள்", "పసుపు", "ಅರಿಶಿನ", "ಅರಿಶಿಣ", "മഞ്ഞൾ", "हळद", "হলুদ"],
    referencePrice: 13000,
    msp: null,
    season: [0.98, 0.93, 0.92, 0.95, 0.98, 1.0, 1.03, 1.05, 1.05, 1.04, 1.03, 1.02],
    volatility: 0.012,
    spoilage: 0.0005,
  },
  {
    id: "banana",
    emoji: "🍌",
    agmarknet: "Banana",
    names: { en: "Banana", hi: "केला", ta: "வாழைப்பழம்", te: "అరటి", kn: "ಬಾಳೆಹಣ್ಣು", ml: "വാഴപ്പഴം", mr: "केळी", bn: "কলা" },
    aliases: ["banana", "bananas", "kela", "vazhai", "vazhaipazham", "arati", "bale", "balehannu", "keli", "kola", "केला", "வாழை", "வாழைப்பழம்", "అరటి", "ಬಾಳೆ", "ಬಾಳೆಹಣ್ಣು", "വാഴ", "വാഴപ്പഴം", "പഴം", "केळी", "কলা"],
    referencePrice: 1800,
    msp: null,
    season: [0.95, 0.95, 0.98, 1.0, 1.0, 0.98, 0.98, 1.02, 1.05, 1.07, 1.05, 0.97],
    volatility: 0.02,
    spoilage: 0.03,
  },
  {
    id: "brinjal",
    emoji: "🍆",
    agmarknet: "Brinjal",
    names: { en: "Brinjal", hi: "बैंगन", ta: "கத்தரிக்காய்", te: "వంకాయ", kn: "ಬದನೆಕಾಯಿ", ml: "വഴുതന", mr: "वांगी", bn: "বেগুন" },
    aliases: ["brinjal", "eggplant", "baingan", "bengan", "kathirikai", "kathirikkai", "vankaya", "badane", "badanekai", "vazhuthana", "vangi", "begun", "बैंगन", "கத்தரிக்காய்", "கத்திரிக்காய்", "వంకాయ", "ಬದನೆಕಾಯಿ", "ಬದನೆ", "വഴുതന", "वांगी", "वांगे", "বেগুন"],
    referencePrice: 2000,
    msp: null,
    season: [0.9, 0.88, 0.95, 1.05, 1.12, 1.12, 1.08, 1.02, 0.98, 0.98, 0.97, 0.95],
    volatility: 0.04,
    spoilage: 0.04,
  },
  {
    id: "tur",
    emoji: "🟤",
    agmarknet: "Arhar (Tur/Red Gram)(Whole)",
    names: { en: "Tur (Red Gram)", hi: "अरहर (तूर)", ta: "துவரை", te: "కంది", kn: "ತೊಗರಿ", ml: "തുവര", mr: "तूर", bn: "অড়হর" },
    aliases: ["tur", "toor", "tuvar", "arhar", "red gram", "redgram", "pigeon pea", "thuvarai", "thuvaram", "kandi", "togari", "thuvara", "अरहर", "तूर", "துவரை", "துவரம்", "కంది", "ಕಂದಿ", "ತೊಗರಿ", "തുവര", "অড়হর"],
    referencePrice: 7200,
    msp: 8000,
    mspLabel: "KMS 2025-26",
    season: [0.96, 0.95, 0.96, 0.98, 1.0, 1.02, 1.03, 1.04, 1.04, 1.03, 1.01, 0.98],
    volatility: 0.008,
    spoilage: 0.0005,
  },
];

const GENERIC_IMAGE = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80";

const BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c]));

// Old builds stored crop names like "Rice" or "Corn" – map them to catalog ids.
const LEGACY = { rice: "paddy", corn: "maize" };

export function getCrop(idOrName) {
  if (!idOrName) return null;
  const key = String(idOrName).trim().toLowerCase();
  return BY_ID[key] || BY_ID[LEGACY[key]] || CROPS.find((c) => c.names.en.toLowerCase() === key) || null;
}

export function cropName(idOrName, lang = "en") {
  const crop = getCrop(idOrName);
  if (!crop) return idOrName || "";
  return crop.names[lang] || crop.names.en;
}

export function cropEmoji(idOrName) {
  return getCrop(idOrName)?.emoji || "🌱";
}

export function cropImage(idOrName) {
  return getCrop(idOrName)?.image || GENERIC_IMAGE;
}

// States as Agmarknet spells them (needed for filtering live data).
export const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "NCT of Delhi", "Nagaland",
  "Odisha", "Puducherry", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
