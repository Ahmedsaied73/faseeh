import { siteConfig } from "@/lib/site-config";

/**
 * SUBJECT PACKS — the platform's subject identity in one place.
 *
 * To re-skin the whole platform (404 / login / register art, hero copy,
 * footer copy, AI-assistant demo), change ACTIVE_SUBJECT below. Nothing else.
 * Add a new subject by adding a pack to `packs` and an art set in
 * components/subject/.
 */
export type Subject = "chemistry" | "arabic" | "math";

export const ACTIVE_SUBJECT: Subject = "math";

type ChatLine = { role: "student" | "assistant"; text: string };

export type SubjectPack = {
  id: Subject;
  platformTag: string;
  teacherName: string;
  brandTagline: string;
  heroBadge: string;
  heroSub: string;
  footerBlurb: string;
  newsletterTitle: string;
  assistantPlaceholder: string;
  assistantSeed: ChatLine[];
  assistantSuggestions: string[];
  assistantKnowledge: { keys: string[]; answer: string }[];
  notFound: { kicker: string; title: string; body: string };
  login: { title: string; subtitle: string; sideLine: string };
  register: { title: string; subtitle: string; sideLine: string };
};

const chemistry: SubjectPack = {
  id: "chemistry",
  platformTag: "أكاديميا الكيمياء",
  teacherName: "الأستاذ عبدالهادي موسى",
  brandTagline: "عبدالهادي موسى للكيمياء",
  heroBadge: "منصة تعليمية متخصصة في الكيمياء",
  heroSub: "في مادة الكيمياء… مفيش صعوبة هتواجهك تاني. اكتشف التعلم والفهم العميق بأسلوب متطور.",
  footerBlurb: "خطوة بخطوة نحو التفوق — دورات كيمياء مرئية، اختبارات فورية، ومتابعة حقيقية لتقدمك.",
  newsletterTitle: "نصيحة كيميائية أسبوعية",
  assistantPlaceholder: "اكتب سؤالك في الكيمياء…",
  assistantSeed: [
    { role: "student", text: "ما الفرق بين التفاعل الطارد والماص للحرارة؟" },
    {
      role: "assistant",
      text: "الطارد يُحرّر طاقة للوسط المحيط فترتفع حرارته (مثل الاحتراق)، بينما الماص يمتص طاقة من الوسط فتنخفض حرارته (مثل ذوبان الثلج).",
    },
  ],
  assistantSuggestions: [
    "اشرح قانون حفظ الكتلة ببساطة",
    "ما الفرق بين الذرة والجزيء؟",
    "كيف أوازن معادلة كيميائية؟",
  ],
  assistantKnowledge: [
    { keys: ["حفظ الكتلة"], answer: "قانون حفظ الكتلة: كتلة المواد المتفاعلة تساوي كتلة النواتج — لا تفنى المادة ولا تُستحدث، فقط تتغير صورتها." },
    { keys: ["ذرة", "جزيء"], answer: "الذرة أصغر وحدة تحتفظ بخواص العنصر، أما الجزيء فمجموعة ذرات مرتبطة كيميائيًا — قد تكون من عنصر واحد أو أكثر." },
    { keys: ["وازن", "موازنة"], answer: "لموازنة معادلة: عدّل المعاملات (وليس الأدلة السفلية) حتى يتساوى عدد كل نوع ذرة في طرفي المعادلة، ابدأ بالعنصر الأكثر تعقيدًا." },
  ],
  notFound: {
    kicker: "Bond not found",
    title: "هذا الرابط انفصل عن الجزيء",
    body: "الصفحة التي تبحث عنها غير متاحة أو تم نقلها إلى مكان آخر.",
  },
  login: {
    title: "مرحبًا بعودتك",
    subtitle: "سجّل الدخول لمتابعة دوراتك وتقدمك.",
    sideLine: "كل جلسة تسجيل دخول هي رابطة جديدة بينك وبين ما تعلمته — أكمل من حيث توقفت.",
  },
  register: {
    title: "ابدأ مدارك الجديد",
    subtitle: "أنشئ حسابًا لتتابع دوراتك ونتائجك من أي جهاز.",
    sideLine: "كل مادة تدرسها تدور حول فكرة واحدة مركزية — نساعدك تكتشفها بوضوح.",
  },
};

const arabic: SubjectPack = {
  id: "arabic",
  platformTag: "أكاديميا العربية",
  teacherName: "الأستاذ محمد ممدوح",
  brandTagline: "فصيح — اللغة العربية للثانوية العامة",
  heroBadge: "فصيح · منصة تعليمية متخصصة في اللغة العربية",
  heroSub: "نحو، بلاغة، أدب… اللغة العربية بتبقى أسهل بكتير لما تفهم قواعدها صح.",
  footerBlurb: "خطوة بخطوة نحو إتقان العربية — دروس مرئية، اختبارات فورية، ومتابعة حقيقية لتقدمك.",
  newsletterTitle: "فائدة لغوية أسبوعية",
  assistantPlaceholder: "اكتب سؤالك في اللغة العربية…",
  assistantSeed: [
    { role: "student", text: "ما الفرق بين الفاعل ونائب الفاعل؟" },
    {
      role: "assistant",
      text: "الفاعل هو من قام بالفعل ويأتي بعد فعل مبني للمعلوم (كتبَ الطالبُ الدرسَ)، أما نائب الفاعل فيحلّ محلّه عند حذفه ويأتي بعد فعل مبني للمجهول (كُتِبَ الدرسُ).",
    },
  ],
  assistantSuggestions: [
    "اشرح لي المبتدأ والخبر ببساطة",
    "ما الفرق بين التاء المربوطة والمفتوحة؟",
    "كيف أبدأ في إعراب جملة؟",
  ],
  assistantKnowledge: [
    { keys: ["المبتدأ", "مبتدأ"], answer: "المبتدأ اسم مرفوع يأتي غالبًا في أول الجملة الاسمية، والخبر هو ما يُتمّ معناه. مثال: «العلمُ نورٌ» — العلم مبتدأ، ونور خبر." },
    { keys: ["التاء", "مربوطة"], answer: "التاء المربوطة (ة) تُنطق هاءً عند الوقف وتأتي غالبًا في الأسماء المؤنثة مثل «مدرسة»، أما التاء المفتوحة (ت) فتُنطق تاءً دائمًا كما في «كتبتُ» و«بيت»." },
    { keys: ["إعراب", "أعرب"], answer: "الإعراب هو بيان وظيفة الكلمة في الجملة وعلامة آخرها. ابدأ دائمًا بنوع الكلمة (فعل / اسم / حرف) ثم موقعها: فاعل، مفعول به، مبتدأ…" },
    { keys: ["الفاعل", "نائب"], answer: "الفاعل يأتي بعد فعل مبني للمعلوم، ونائب الفاعل يأتي بعد فعل مبني للمجهول ويأخذ مكان الفاعل المحذوف." },
  ],
  notFound: {
    kicker: "Syntax error · no i'rab",
    title: "هذه الصفحة ليس لها محل من الإعراب",
    body: "الصفحة التي تبحث عنها لا موقع لها في الجملة — ربما نُقلت أو حُذفت.",
  },
  login: {
    title: "أهلًا بعودتك",
    subtitle: "سجّل الدخول لتكمل دروسك من حيث وقفت.",
    sideLine: "كل كلمة تتعلمها تفتح بابًا جديدًا في اللغة — أكمل من حيث توقفت.",
  },
  register: {
    title: "ابدأ رحلتك مع العربية",
    subtitle: "أنشئ حسابًا لتتابع دروسك ونتائجك من أي جهاز.",
    sideLine: "اللغة تُبنى حرفًا بعد حرف، وجملةً بعد جملة — ابدأ بأول حرف.",
  },
};

const math: SubjectPack = {
  id: "math",
  platformTag: "أكاديميا الرياضيات",
  teacherName: process.env.NEXT_PUBLIC_TEACHER_NAME ?? siteConfig.teacherName,
  brandTagline: "الباشمهندس محمد زين — الرياضيات للثانوية العامة",
  heroBadge: "منصة تعليمية متخصصة في الرياضيات",
  heroSub: "جبر، تفاضل، هندسة… الرياضيات بتبقى أبسط بكتير لما تفهم الفكرة قبل القانون.",
  footerBlurb: "خطوة بخطوة نحو التفوق في الرياضيات — شرح مرئي، اختبارات فورية، ومتابعة حقيقية لتقدمك.",
  newsletterTitle: "مسألة الأسبوع",
  assistantPlaceholder: "اكتب سؤالك في الرياضيات…",
  assistantSeed: [
    { role: "student", text: "إزاي أحل معادلة من الدرجة التانية؟" },
    {
      role: "assistant",
      text: "حلّل المقدار لو أمكن: x² − 5x + 6 = (x − 2)(x − 3) فيكون الحل x = 2 أو x = 3. ولو التحليل صعب استخدم القانون العام: x = (−b ± √(b² − 4ac)) ÷ 2a.",
    },
  ],
  assistantSuggestions: [
    "اشرح لي معنى المشتقة ببساطة",
    "ما الفرق بين الدالة والمعادلة؟",
    "إزاي أحسب مساحة المثلث؟",
  ],
  assistantKnowledge: [
    { keys: ["المشتقة", "تفاضل"], answer: "المشتقة بتقيس معدل تغيّر الدالة عند نقطة، يعني ميل المماس للمنحنى عندها. مثال: مشتقة x² هي 2x، فعند x = 3 يكون الميل = 6." },
    { keys: ["تربيعية", "الدرجة التانية", "الدرجة الثانية"], answer: "حلّل المقدار لو أمكن، مثلًا x² − 5x + 6 = (x − 2)(x − 3) فيكون x = 2 أو x = 3. وإن صعب التحليل استخدم القانون العام x = (−b ± √(b² − 4ac)) ÷ 2a." },
    { keys: ["دالة", "الدالة"], answer: "الدالة قاعدة بتربط كل قيمة x بقيمة واحدة بالظبط f(x). أما المعادلة فبتقولك إن طرفين متساويين وبنبحث عن قيمة x اللي تحقق ده." },
    { keys: ["مساحة", "مثلث"], answer: "مساحة المثلث = ½ × القاعدة × الارتفاع. مثال: قاعدة 6 وارتفاع 4 → المساحة = 12 وحدة مربعة." },
    { keys: ["فيثاغورث"], answer: "في المثلث القائم الزاوية: مربع الوتر = مجموع مربعي الضلعين الآخرين. مثال: 3 و4 و5 لأن 9 + 16 = 25." },
  ],
  notFound: {
    kicker: "x ∉ D(f)",
    title: "هذه الصفحة خارج مجال الدالة",
    body: "الصفحة التي تبحث عنها غير معرّفة عند هذه القيمة — ربما نُقلت أو حُذفت.",
  },
  login: {
    title: "أهلًا بعودتك",
    subtitle: "سجّل الدخول لتكمل دروسك من حيث وقفت.",
    sideLine: "كل مسألة تحلّها تقرّبك من التي تليها — أكمل من حيث توقفت.",
  },
  register: {
    title: "ابدأ رحلتك مع الرياضيات",
    subtitle: "أنشئ حسابًا لتتابع دروسك ونتائجك من أي جهاز.",
    sideLine: "الرياضيات تُبنى خطوةً فوق خطوة، مثل متتالية لا تنتهي — ابدأ بالحد الأول.",
  },
};

export const packs: Record<Subject, SubjectPack> = { chemistry, arabic, math };

export const subject: SubjectPack = packs[ACTIVE_SUBJECT];
