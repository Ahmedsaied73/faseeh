/**
 * SUBJECT PACKS — the platform's subject identity in one place.
 *
 * To re-skin the whole platform (404 / login / register art, hero copy,
 * footer copy, AI-assistant demo), change ACTIVE_SUBJECT below. Nothing else.
 * Add a new subject by adding a pack to `packs` and an art set in
 * src/components/subject/.
 */
export type Subject = "chemistry" | "arabic";

export const ACTIVE_SUBJECT: Subject = "arabic";

type ChatLine = { role: "student" | "assistant"; text: string };

export type SubjectPack = {
  id: Subject;
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
  heroBadge: "منصة تعليمية متخصصة في اللغة العربية",
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

export const packs: Record<Subject, SubjectPack> = { chemistry, arabic };

export const subject: SubjectPack = packs[ACTIVE_SUBJECT];
