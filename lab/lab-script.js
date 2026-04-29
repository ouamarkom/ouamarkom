// ملف JavaScript الرئيسي لـمختبر أوامركم
const SUPABASE_URL =
  window.ENV?.SUPABASE_URL || "https://imwricgokkflresvtvpg.supabase.co";
const SUPABASE_KEY =
  window.ENV?.SUPABASE_KEY || "sb_publishable_E2RRNUojsNxxcwo_mL_ePQ_ThPz0uK2";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "ouamarkom-web" } },
});
let currentRawPrompt = "";
let userCredits = parseInt(localStorage.getItem("ouamarkom_credits")) || 5;
let currentCategory = "creators";
let currentIndex = 0;
let currentPrompts = [];
const canvas = document.getElementById("network-canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particles = [];
function processPrompt() {
  const topic = document.getElementById("topic-input").value || "[الموضوع]";
  const audience =
    document.getElementById("audience-input").value || "[الجمهور]";
  const tone = document.getElementById("tone-input").value || "[الأسلوب]";
  const updatedText = currentRawPrompt
    .replace(/\[موضوعك\]|\[X\]|\[الموضوع\]/g, topic)
    .replace(/\[فئة معينة\]|\[جمهور معين\]|\[الجمهور\]/g, audience)
    .replace(/\[أسلوب\]|\[نبرة\]|\[الأسلوب\]/g, tone);
  document.getElementById("prompt-output").value = updatedText;
}
["topic-input", "audience-input", "tone-input"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", processPrompt);
});
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
function displayPrompt(promptData) {
  currentRawPrompt = promptData.prompt;
  document.getElementById("inputs-container").classList.remove("hidden");
  processPrompt();
  document.getElementById("impact-text").innerText = promptData.impact;
}
function showPromptStatus(promptMessage, impactMessage) {
  document.getElementById("inputs-container").classList.remove("hidden");
  currentRawPrompt = promptMessage;
  document.getElementById("prompt-output").value = promptMessage;
  document.getElementById("impact-text").innerText = impactMessage;
  document.getElementById("category-label").innerText =
    getCategoryName(currentCategory);
  document.getElementById("prompt-counter").innerText = "0 / 0";
}
function processTransaction() {
  if (userCredits > 0) {
    userCredits--;
    localStorage.setItem("ouamarkom_credits", userCredits);
    document.getElementById("credit-count").innerText = userCredits;
    return true;
  }
  showToast("عذراً، نفذ رصيدك! شارك المنصة للحصول على نقاط إضافية 💰");
  return false;
}
async function fetchLivePrompts(category) {
  if (!navigator.onLine) {
    showToast("أنت غير متصل بالإنترنت. تحقق من الشبكة.");
    showPromptStatus(
      "تعذر تحميل الأوامر لأن الجهاز غير متصل بالإنترنت.",
      "يرجى إعادة المحاولة بعد استعادة الاتصال.",
    );
    return [];
  }
  try {
    const { data, error } = await _supabase
      .from("prompts")
      .select("*")
      .eq("category", category);
    if (error) {
      console.error("خطأ في جلب البيانات:", error);
      showToast("تعذر تحميل الأوامر الآن. حاول لاحقاً.");
      showPromptStatus(
        "تعذر تحميل الأوامر من الخادم حالياً.",
        "تحقق من اتصال الإنترنت أو أعد تحميل الصفحة.",
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("خطأ في جلب البيانات:", err);
    showToast("تعذر الاتصال بالخادم. تأكد من الإنترنت.");
    showPromptStatus(
      "تعذر الاتصال بخادم Supabase.",
      "يرجى التحقق من الشبكة وإعادة المحاولة.",
    );
    return [];
  }
}
async function renderPrompt() {
  if (currentPrompts.length === 0)
    currentPrompts = await fetchLivePrompts(currentCategory);
  if (currentPrompts.length === 0) {
    const errorItem = {
      prompt: "لا يوجد أوامر متاحة حالياً أو تعذّر تحميلها.",
      impact: "إذا استمر هذا، تحقق من اتصال الإنترنت أو أعد تحميل الصفحة.",
    };
    document.getElementById("inputs-container").classList.remove("hidden");
    await displayPrompt(errorItem);
    document.getElementById("prompt-counter").innerText = "0 / 0";
    lucide.createIcons();
    return;
  }
  await displayPrompt(currentPrompts[currentIndex]);
  document.getElementById("category-label").innerText =
    getCategoryName(currentCategory);
  document.getElementById("prompt-counter").innerText =
    `${currentIndex + 1} / ${currentPrompts.length}`;
  lucide.createIcons();
}
function getCategoryName(cat) {
  return {
    creators: "صناع المحتوى",
    education: "التعليم والطلاب",
    business: "الإدارة والأعمال",
    marketing: "التسويق والمبيعات",
    lifestyle: "الحياة والتطوير",
    tech: "التقنية والبرمجة",
  }[cat];
}
async function changeCategory(cat, element) {
  currentCategory = cat;
  currentIndex = 0;
  document
    .querySelectorAll(".cat-item")
    .forEach((btn) => btn.classList.remove("active"));
  if (element) element.classList.add("active");
  currentPrompts = await fetchLivePrompts(cat);
  await renderPrompt();
  lucide.createIcons();
}
function nextPrompt() {
  if (currentIndex < currentPrompts.length - 1) {
    currentIndex++;
    renderPrompt();
  }
}
function prevPrompt() {
  if (currentIndex > 0) {
    currentIndex--;
    renderPrompt();
  }
}
function copyPrompt() {
  const text = document.getElementById("prompt-output");
  navigator.clipboard.writeText(text.value);
  showToast("تم نسخ الأمر بنجاح! 📋");
}
function shareResult() {
  const shareUrl = "https://ouamarkom.com";
  navigator.clipboard.writeText(shareUrl);
  showToast("تم نسخ رابط المشاركة! انشره الآن 🔥");
}
class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.speedY = Math.random() * 0.5 - 0.25;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
    if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
  }
  draw() {
    ctx.fillStyle = "rgba(108, 92, 231, 0.3)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
function init() {
  for (let i = 0; i < 80; i++) particles.push(new Particle());
}
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animate);
}
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("credit-count").innerText = userCredits;
  init();
  animate();
  changeCategory("creators");
});
async function generateProfessionalPrompt() {
  const ideaInput = document.getElementById("user-idea");
  const idea = ideaInput.value.trim();
  const btn = document.getElementById("generate-btn");
  const impactText = document.getElementById("impact-text");
  const outputArea = document.getElementById("prompt-output");

  // 1. التحقق من "جوهر الفكرة"
  if (!idea) {
    showToast("أدخل جوهر فكرتك أولاً لنمنحها أبعاداً احترافية! 💡");
    return;
  }

  // 2. التحقق من "الاعتمادات الرقمية"
  if (!processTransaction()) return;

  // 3. بدء بروتوكول الصياغة (تغيير حالة الزر)
  btn.innerHTML = '<span class="loader"></span> جاري معالجة الفكرة الخام وتحويلها لأصل رقمي...';
  btn.disabled = true;

  try {
    // 4. استدعاء "المايسترو" (Edge Function)
    const { data, error } = await _supabase.functions.invoke(
      "ai-orchestrator",
      { body: { intent: idea } }, 
    );

    if (error) throw error;

    // 5. استلام "الأمر الذهبي" المهندس
    const result = data?.professional_prompt || data?.professionalPrompt;

    if (result) {
      // حقن النتيجة في مخرج التنفيذ اللحظي
      outputArea.value = result;
      
      // تحديث نص التأثير بلغة "المايسترو"
      impactText.innerText = "اكتملت هندسة الأمر: فكرتك الآن أصبحت 'أصلاً رقمياً' جاهزاً للاستحواذ والتنفيذ. 🥇";
      
      // تجربة المستخدم (التنقل السلس والنسخ)
      document.getElementById("lab").scrollIntoView({ behavior: "smooth" });
      showToast("تم الاستحواذ على الأمر بنجاح! (-1 اعتماد رقمي)");
      
      // تفريغ المدخلات استعداداً لفكرة جديدة
      ideaInput.value = "";
    } else {
      throw new Error("تأخر في استجابة بروتوكول الهندسة");
    }

  } catch (err) {
    console.error("Engineering Protocol Failure:", err);
    showToast("عذراً، حدث اضطراب في بروتوكول المعالجة.. تم تأمين اعتماداتك 🛡️");
    
    // استرداد الاعتمادات فوراً في حال الفشل
    userCredits++;
    localStorage.setItem("ouamarkom_credits", userCredits);
    document.getElementById("credit-count").innerText = userCredits;
  } finally {
    // العودة إلى وضع الاستعداد
    btn.innerHTML = '<i data-lucide="zap"></i> صياغة الأمر الاحترافي ✨';
    lucide.createIcons();
    btn.disabled = false;
  }
}
