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
    // Phase 4 - Science Keyboard
    "rich.keyboardScience": "علوم",
    "rich.keyboardScienceTooltip": "لوحة مفاتيح العلوم والرياضيات",
    // Phase 4 - Chem Block
    "rich.chemInsertArrow": "سهم تفاعل (->)",
    "rich.chemInsertEquilibrium": "سهم اتزان (<=>)",
    "rich.chemInsertGas": "تصاعد غاز (^)",
    "rich.chemInsertPrecipitate": "راسب (v)",
    "rich.chemInsertHeat": "حرارة ([\\Delta])",
    "rich.chemInvalidFormula": "صيغة كيميائية غير صحيحة أو أقواس غير متوازنة",
    "rich.chemPreview": "معاينة المعادلة الكيميائية",
    // Phase 5 - Admin Authoring & RichField
    "rich.previewAsStudent": "معاينة كما يراها الطالب",
    "rich.editContent": "تعديل المحتوى",
    "rich.studentPreviewBadge": "معاينة الطالب",
    "rich.modelAnswerSecurityNote": "ملاحظة أمان: نموذج الإجابة محمي على الخادم — لن يظهر للطالب نهائياً في أي استجابة ويُستخدم فقط للتقييم والتصحيح بالذكاء الاصطناعي.",
    "rich.answerFormatLabel": "صيغة إجابة الطالب (المعادلات الرياضية)",
    "rich.answerFormatFollowSubject": "بحسب مادة الاختبار (تلقائي)",
    "rich.answerFormatRich": "السماح بالمعادلات (RICH)",
    "rich.answerFormatPlain": "نص عادي فقط (PLAIN)",
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
    // Phase 4 - Science Keyboard
    "rich.keyboardScience": "Science",
    "rich.keyboardScienceTooltip": "Science & Math keyboard",
    // Phase 4 - Chem Block
    "rich.chemInsertArrow": "Reaction arrow (->)",
    "rich.chemInsertEquilibrium": "Equilibrium arrow (<=>)",
    "rich.chemInsertGas": "Gas release (^)",
    "rich.chemInsertPrecipitate": "Precipitate (v)",
    "rich.chemInsertHeat": "Heat condition ([\\Delta])",
    "rich.chemInvalidFormula": "Invalid chemical formula or unbalanced brackets",
    "rich.chemPreview": "Chemical equation preview",
    // Phase 5 - Admin Authoring & RichField
    "rich.previewAsStudent": "Preview as student",
    "rich.editContent": "Edit content",
    "rich.studentPreviewBadge": "Student preview",
    "rich.modelAnswerSecurityNote": "Security Note: The reference answer is server-protected — it is never returned to students in any response and is used only for grading and AI evaluation.",
    "rich.answerFormatLabel": "Student Answer Format (Math Equations)",
    "rich.answerFormatFollowSubject": "Follow subject (default)",
    "rich.answerFormatRich": "Allow equations (RICH)",
    "rich.answerFormatPlain": "Plain text only (PLAIN)",
  },
} as const;

export type RichMessageKey = keyof typeof richMessages.ar;

export function tRich(key: RichMessageKey, locale: "ar" | "en" = "ar"): string {
  const dict = richMessages[locale] || richMessages.ar;
  return dict[key] || richMessages.ar[key] || key;
}
