// lib/richContent/i18n.ts
// Standard localized strings for Rich Editor & Display components (Arabic & English)

export const richMessages = {
  ar: {
    "rich.addText": "إضافة نص",
    "rich.addEquation": "إضافة معادلة",
    "rich.addChem": "إضافة معادلة كيميائية",
    "rich.moveUp": "تحريك لأعلى",
    "rich.moveDown": "تحريك لأسفل",
    "rich.delete": "حذف الكتلة",
    "rich.openKeyboard": "فتح لوحة المفاتيح",
    "rich.incomplete": "المعادلة تحتوي على مواضع غير مكتملة",
    "rich.textLabel": "نص الإجابة",
    "rich.equationLabel": "معادلة رياضية",
    "rich.chemLabel": "معادلة كيميائية",
    "rich.chemHint": "أمثلة: 2H2 + O2 -> 2H2O أو CaCO3 -> CaO + CO2",
    "rich.limitReached": "تم الوصول إلى الحد الأقصى لعدد الكتل (60)",
    "rich.errorTooLarge": "المحتوى تجاوز الحجم المسموح به",
    "rich.errorBadMath": "صيغة رياضية غير صحيحة",
    "rich.textPlaceholder": "اكتب نص الإجابة هنا...",
    "rich.equationPlaceholder": "اكتب المعادلة الرياضية...",
  },
  en: {
    "rich.addText": "Add text",
    "rich.addEquation": "Add equation",
    "rich.addChem": "Add chemical equation",
    "rich.moveUp": "Move up",
    "rich.moveDown": "Move down",
    "rich.delete": "Delete block",
    "rich.openKeyboard": "Open keyboard",
    "rich.incomplete": "Equation has incomplete placeholders",
    "rich.textLabel": "Answer text",
    "rich.equationLabel": "Math equation",
    "rich.chemLabel": "Chemical equation",
    "rich.chemHint": "Examples: 2H2 + O2 -> 2H2O or CaCO3 -> CaO + CO2",
    "rich.limitReached": "Block limit reached (60)",
    "rich.errorTooLarge": "Content exceeds size limit",
    "rich.errorBadMath": "Invalid math syntax",
    "rich.textPlaceholder": "Write answer text here...",
    "rich.equationPlaceholder": "Write math equation...",
  },
} as const;

export type RichMessageKey = keyof typeof richMessages.ar;

export function tRich(key: RichMessageKey, locale: "ar" | "en" = "ar"): string {
  const dict = richMessages[locale] || richMessages.ar;
  return dict[key] || richMessages.ar[key] || key;
}
