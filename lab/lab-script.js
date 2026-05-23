import { SB_URL, SB_KEY, OLD_SB_URL, OLD_SB_KEY } from './config.js';

const supabaseData = supabase.createClient(SB_URL, SB_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
});

const supabaseAI = supabase.createClient(OLD_SB_URL, OLD_SB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

window.addEventListener('DOMContentLoaded', async () => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        console.log("تم الوصول للمختبر، جارٍ معالجة التوكن...");
    }
    await checkUserSession();
});

let currentRawPrompt = "";
let currentUser = null; 
let userCredits = 0; 
let isSignUpMode = true;

let currentCategory = "creators";
let currentIndex = 0;
let currentPrompts = [];

// --- نظام التحقق من الجلسة وجلب البيانات السحابية ---
async function checkUserSession() {
  const { data: { session } } = await supabaseData.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    await fetchUserCredits(currentUser.id);
    updateAuthUI(true);
  } else {
    currentUser = null;
    userCredits = 0;
    document.getElementById("credit-count").innerText = "0";
    updateAuthUI(false);
  }
}

async function fetchUserCredits(userId) {
  try {
    const { data, error } = await supabaseData
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error) throw error;
    userCredits = data ? data.credits : 0;
    document.getElementById("credit-count").innerText = userCredits;
  } catch (err) {
    console.error("Error fetching credits:", err);
  }
}

function updateAuthUI(isLoggedIn) {
  const btn = document.getElementById("auth-action-btn");
  if (!btn) return;
  if (isLoggedIn) {
    btn.innerHTML = `<i data-lucide="log-out"></i> تسجيل الخروج`;
    btn.onclick = handleSignOut;
  } else {
    btn.innerHTML = `<i data-lucide="log-in"></i> تسجيل الدخول`;
    btn.onclick = openAuthModal;
  }
  if (window.lucide) lucide.createIcons();
}

// --- التحكم بالنافذة المنبثقة (Modal) ---
function openAuthModal() {
  document.getElementById("auth-modal").classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  document.getElementById("modal-title").innerText = isSignUpMode ? "الانضمام إلى اقتصاد الأوامر" : "مرحباً بعودتك";
  document.getElementById("modal-desc").innerText = isSignUpMode ? "أنشئ حسابك لحفظ أصولك الرقمية ونقاطك السحابية بأمان." : "أدخل بياناتك للولوج السحابي الفوري لرصيدك.";
  document.getElementById("submit-btn-text").innerText = isSignUpMode ? "إنشاء حساب جديد" : "تسجيل الدخول الفوري";
  document.getElementById("auth-switch-msg").innerText = isSignUpMode ? "لديك حساب بالفعل؟" : "ليس لديك حساب مسبق؟";
  document.getElementById("auth-switch-link").innerText = isSignUpMode ? "تسجيل الدخول" : "إنشاء حساب";
}

// --- معالجة الحسابات عبر واجهة برمجيات Supabase Auth ---
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const submitBtn = document.getElementById("auth-submit-btn");

  submitBtn.disabled = true;
  
  try {
    if (isSignUpMode) {
      const { data, error } = await supabaseData.auth.signUp({ email, password });
      if (error) throw error;
      
      showToast("🚀 تم إرسال رابط تفعيل الحساب إلى بريدك الإلكتروني بنجاح!");
    } else {
      const { data, error } = await supabaseData.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          showToast("⚠️ حسابك غير مفعل! يرجى الضغط على الرابط المرسل لبريدك.");
          submitBtn.disabled = false;
          return;
        }
        throw error;
      }
      showToast("✨ أهلاً بك في أوامركم! تم تسجيل الدخول بنجاح.");
    }
    closeAuthModal();
    await checkUserSession();
  } catch (err) {
    showToast(`❌ خطأ: ${err.message || "فشلت العملية"}`);
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleSignOut() {
  await supabaseData.auth.signOut();
  showToast("🔒 تم تسجيل الخروج.");
  await checkUserSession();
}

// --- دالة تعويض العميل بنقطة في حال فشل خادم الـ AI المعالج ---
async function refundTransaction() {
  if (currentUser) {
    userCredits++;
    await supabaseData
      .from("profiles")
      .update({ credits: userCredits })
      .eq("id", currentUser.id);
    document.getElementById("credit-count").innerText = userCredits;
  }
}

function processPrompt() {
  const topic = document.getElementById("topic-input").value || "[الموضوع]";
  const audience = document.getElementById("audience-input").value || "[الجمهور]";
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
  document.getElementById("category-label").innerText = getCategoryName(currentCategory);
  document.getElementById("prompt-counter").innerText = "0 / 0";
}

async function processTransaction() {
  if (!currentUser) {
    showToast("⚠️ يجب عليك تسجيل الدخول أولاً لصياغة الأوامر الاحترافية!");
    openAuthModal();
    return false;
  }

  if (userCredits > 0) {
    userCredits--;
    
    // التحديث الفوري والآمن داخل جدول profiles المحمي بـ RLS
    const { error } = await supabaseData
      .from("profiles")
      .update({ credits: userCredits })
      .eq("id", currentUser.id);

    if (error) {
      console.error(error);
      showToast("❌ حدث خطأ أثناء مزامنة الرصيد السحابي.");
      userCredits++; // تراجع موضعي في حال فشل الاتصال بالشبكة
      return false;
    }

    document.getElementById("credit-count").innerText = userCredits;
    return true;
  }
  
  showToast("عذراً، نفذ رصيدك السحابي! شارك المنصة للحصول على نقاط إضافية 💰");
  return false;
}

async function fetchLivePrompts(category) {
  if (!navigator.onLine) {
    showToast("أنت غير متصل بالإنترنت.");
    return [];
  }
  try {
    const { data, error } = await supabaseAI
      .from("prompts")
      .select("*")
      .eq("category", category);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("خطأ في جلب البيانات:", err);
    showToast("تعذر تحميل الأوامر الجاهزة حالياً.");
    return [];
  }
}

async function renderPrompt() {
  if (currentPrompts.length === 0)
    currentPrompts = await fetchLivePrompts(currentCategory);

  if (currentPrompts.length === 0) {
    const errorItem = {
      prompt: "لا يوجد أوامر متاحة حالياً.",
      impact: "تحقق من اتصال الإنترنت أو أعد تحميل الصفحة.",
    };
    await displayPrompt(errorItem);
    return;
  }
  
  await displayPrompt(currentPrompts[currentIndex]);
  
  const inputsContainer = document.getElementById("inputs-container");
  if (inputsContainer) inputsContainer.classList.remove("hidden");

  document.getElementById("category-label").innerText = getCategoryName(currentCategory);
  document.getElementById("prompt-counter").innerText = `${currentIndex + 1} / ${currentPrompts.length}`;
  
  if (window.lucide) lucide.createIcons();
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

function toggleMaestroView(mode) {
  const editView = document.getElementById("edit-view");
  const executionView = document.getElementById("execution-view");
  const badge = document.getElementById("result-badge");

  if (mode === "execution") {
    editView.classList.add("hidden");
    executionView.classList.remove("hidden");
    badge.innerHTML = `<i data-lucide="cpu"></i> خطة العمل الذكية`;
  } else {
    editView.classList.remove("hidden");
    executionView.classList.add("hidden");
    badge.innerHTML = `<i data-lucide="wand-2"></i> الأمر المهندس`;
  }

  if (window.lucide) lucide.createIcons();
}

async function generateProfessionalPrompt() {
  const ideaInput = document.getElementById("user-idea");
  const idea = ideaInput.value.trim();
  const btn = document.getElementById("generate-btn");

  const resultContainer = document.getElementById("ai-result-container");
  const outputAreaAI = document.getElementById("prompt-output-ai");
  const impactAreaAI = document.getElementById("impact-text-ai");

  if (!idea) {
    showToast("أدخل جوهر فكرتك أولاً! 💡");
    return;
  }

  if (!(await processTransaction())) return;

  btn.disabled = true;
  const countdownInterval = startSmartTimer(btn);

  toggleMaestroView("execution");
  renderWorkflowCards("", true);

  try {
    const { data, error } = await supabaseData.functions.invoke(
      "ai-orchestrator",
      {
        body: JSON.stringify({ intent: idea }),
      },
    );

    if (error) throw error;

    clearInterval(countdownInterval);

    const result = data?.professional_prompt || data?.professionalPrompt;

    if (result) {
      resultContainer.classList.remove("hidden");
      resultContainer.classList.add("success-animation");
      setTimeout(
        () => resultContainer.classList.remove("success-animation"),
        2000,
      );

      outputAreaAI.value = result;

      const hasSteps =
        result.includes("الخطوة") ||
        result.includes("◈") ||
        result.includes("المرحلة") ||
        result.includes("Step");

      if (hasSteps) {
        renderWorkflowCards(result);
        toggleMaestroView("execution");
      } else {
        toggleMaestroView("edit");
      }

      impactAreaAI.innerText =
        "تم صياغة البروتوكول بنجاح. هذا الأمر مهندس ليعمل كأصل رقمي عالي الكفاءة عند حقنه في أنظمة الذكاء الاصطناعي العالمية.";
      resultContainer.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("تمت الهندسة بنجاح! ✨");
    }
  } catch (err) {
    clearInterval(countdownInterval);
    console.error("AI Failure:", err);
    showToast("حدث خطأ.. تم استعادة رصيدك 🛡️");
    await refundTransaction();
    renderWorkflowCards("");
  } finally {
    btn.innerHTML = '<i data-lucide="sparkles"></i> صياغة الأمر الاحترافي';
    if (window.lucide) lucide.createIcons();
    btn.disabled = false;
  }
}

function renderWorkflowCards(rawText, isLoading = false) {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML = "";

  if (isLoading) {
    for (let i = 0; i < 3; i++) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "luxury-card skeleton-pulse saas-unit";
      skeletonCard.innerHTML = `
        <div class="card-title" style="background: rgba(255,255,255,0.08); height: 20px; width: 40%; border-radius: 6px;"></div>
        <div class="card-content" style="background: rgba(255,255,255,0.04); height: 60px; width: 100%; border-radius: 10px; margin-top: 15px;"></div>
      `;
      container.appendChild(skeletonCard);
    }
    return;
  }

  const steps = rawText
    .split(/\n(?=الخطوة|المرحلة|Step|◈|Unit|الوحدة)/g)
    .filter((s) => s.trim().length > 10);

  steps.forEach((step, index) => {
    const card = document.createElement("div");
    card.className = "luxury-card saas-unit";
    card.style.animationDelay = `${index * 0.1}s`;

    const lines = step.trim().split("\n");
    let title = lines[0]
      .replace(/◈|الخطوة \d+:|المرحلة \d+:|Step \d+:|الوحدة \d+:/g, "")
      .trim();
    if (!title) title = `إجراء التنفيذ الذكي ${index + 1}`;

    const content = lines.slice(1).join("\n");
    const forbiddenTitles = [
      "مخرج",
      "أوامركم",
      "الخاتمة",
      "تم",
      "سلاسل العمل",
    ];
    const isSpecialCard = forbiddenTitles.some((word) => title.includes(word));

    card.innerHTML = `
      <div class="card-title">${escapeHTML(title)}</div>
      <div class="card-content">${escapeHTML(content).replace(/\n/g, "<br>")}</div>
      ${
        !isSpecialCard
          ? `
        <div class="card-actions" style="margin-top: 20px;">
          <button class="step-btn">
            <i data-lucide="rocket"></i> بدء التنفيذ الفوري
          </button>
        </div>
      `
          : ""
      }
    `;

    if (!isSpecialCard) {
      const btn = card.querySelector(".step-btn");
      if (btn) {
        btn.addEventListener("click", function() {
          executeStep(step, this);
        });
      }
    }

    container.appendChild(card);
  });

  injectFinalCopyButton();
}

function injectFinalCopyButton() {
  const container = document.getElementById("ai-result-container");
  if (!container) return;
  
  const oldBtn = document.getElementById("final-copy-btn");
  if (oldBtn) oldBtn.remove();

  const actionWrapper = document.createElement("div");
  actionWrapper.id = "final-copy-btn";
  actionWrapper.className = "execution-actions-wrapper";

  actionWrapper.innerHTML = `
    <div style="margin-bottom: 25px;">
      <p style="color: var(--text-main); font-size: 1.1rem; font-weight: 800; margin-bottom: 8px;">
        جاهز للتنفيذ الشامل؟
      </p>
      <p style="color: var(--text-dim); font-size: 0.85rem;">
        اختر المنصة المفضلة لديك لنقل البروتوكول المهندس بالكامل
      </p>
    </div>
    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
      <button class="ai-btn chatgpt" data-platform="chatgpt">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/chatgpt.png" alt="ChatGPT" width="20" height="20">
        ChatGPT
      </button>
      <button class="ai-btn gemini" data-platform="gemini">
        <img src="https://cdn.simpleicons.org/googlegemini/white" alt="Gemini" width="20" height="20">
        Gemini
      </button>
      <button class="ai-btn claude" data-platform="claude">
        <img src="https://cdn.simpleicons.org/anthropic/white" alt="Claude" width="20" height="20">
        Claude
      </button>
    </div>
  `;

  actionWrapper.querySelectorAll(".ai-btn").forEach((btn) => {
    btn.addEventListener("click", function() {
      exportFullPrompt(this.getAttribute("data-platform"));
    });
  });

  container.appendChild(actionWrapper);
  if (window.lucide) lucide.createIcons();
}

function executeStep(text, btn) {
  const originalHTML = btn.innerHTML;

  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add("copy-success");
    btn.innerHTML = `<i data-lucide="external-link"></i> تم النسخ.. ننتقل لـ ChatGPT`;

    if (window.lucide) lucide.createIcons();
    showToast("تم الحفظ في الحافظة 📋");

    setTimeout(() => {
      window.open("https://chatgpt.com", "_blank");
      setTimeout(() => {
        btn.classList.remove("copy-success");
        btn.innerHTML = originalHTML;
        if (window.lucide) lucide.createIcons();
      }, 500);
    }, 1200);
  });
}

function exportFullPrompt(platform) {
  const text = document.getElementById("prompt-output-ai").value;
  const urls = {
    chatgpt: "https://chatgpt.com",
    gemini: "https://gemini.google.com",
    claude: "https://claude.ai",
  };

  const platformNames = {
    chatgpt: "ChatGPT",
    gemini: "Gemini",
    claude: "Claude"
  };

  showToast(`✨ تم نسخ البروتوكول! وجهتك القادمة هي ${platformNames[platform]} 🚀`);

  setTimeout(() => {
    navigator.clipboard.writeText(text).then(() => {
      window.open(urls[platform], "_blank");
    }).catch(() => {
      window.open(urls[platform], "_blank");
    });
  }, 1000);
}

function startSmartTimer(element) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    if (seconds <= 10) {
      element.innerHTML = `<span class="loader"></span> هندسة البروتوكول (${11 - seconds}ث)`;
    } else if (seconds <= 17) {
      element.innerHTML = `<span class="loader"></span> فحص سلاسل العمل...`;
    } else if (seconds <= 22) {
      element.innerHTML = `<span class="loader"></span> تحسين الأصول الرقمية...`;
    } else {
      element.innerHTML = `<span class="loader"></span> اللمسات النهائية العميقة...`;
    }
  }, 1000);
  return interval;
}

function copyPrompt() {
  const text = document.getElementById("prompt-output").value;
  if (!text || text.includes("لا يوجد أوامر")) {
    showToast("لا يوجد برومبت لنسخه حالياً! 💡");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("تم الاستحواذ على الأمر بنجاح! 🚀");
    })
    .catch(() => {
      showToast("فشل النسخ التلقائي، يرجى نسخه يدوياً. 🛡️");
    });
}

async function shareResult() {
  if (!currentUser) {
    showToast("سجل دخولك أولاً لتكسب نقاطاً من المشاركة! 💰");
    return;
  }

  // 1. فحص هل المتصفح يدعم ميزة المشاركة الأصلية (Native Share مثل الهواتف)
  if (navigator.share) {
    try {
      // ننتظر حتى يقوم المستخدم بالمشاركة الفعلية بنجاح
      await navigator.share({
        title: "منصة أوامركم",
        text: "انظر إلى هذا الأمر الاحترافي المهندس عبر منصة أوامركم لقيادة الذكاء الاصطناعي!",
        url: window.location.href,
      });

      // الكود لن يصل إلى هنا إلا إذا تمت المشاركة بنجاح 100%
      showToast("شكراً لمشاركتك! جاري تحديث رصيدك السحابي... ⏳");
      await awardCredit();

    } catch (shareError) {
      // إذا ألغى المستخدم العملية أو حدث خطأ، لن يحصل على شيء
      console.log("تم إلغاء عملية المشاركة أو فشلها:", shareError);
      showToast("تم إلغاء المشاركة.. شارك الرابط لتكسب النقاط 🛡️");
    }
  } 
  // 2. الحل البديل للأجهزة التي لا تدعم الميزة (مثل الكمبيوتر) - نسخ الرابط
  else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("تم نسخ رابط المنصة! جاري تحديث رصيدك السحابي... 🌐⏳");
      await awardCredit();
    } catch (clipError) {
      console.error("فشل نسخ الرابط:", clipError);
      showToast("عذراً، فشل نسخ الرابط تلقائياً. ❌");
    }
  }
}

// دالة منفصلة ونظيفة للتعامل مع إضافة النقاط وتحديث السيرفر لتجنب تكرار الكود (DRY Principle)
async function awardCredit() {
  // إضافة النقطة محلياً في الواجهة أولاً
  userCredits++;
  document.getElementById("credit-count").innerText = userCredits;

  try {
    const { error } = await supabaseData
      .from("profiles")
      .update({ credits: userCredits })
      .eq("id", currentUser.id);

    if (error) throw error;
    
    showToast("تمت إضافة 1 نقطة إلى رصيدك السحابي بنجاح! 💰");
  } catch (dbError) {
    console.error("فشل تحديث نقاط المشاركة سحابياً:", dbError);
    // تراجع تكتيكي (Rollback) في حال فشل السيرفر لضمان دقة البيانات
    userCredits--;
    document.getElementById("credit-count").innerText = userCredits;
    showToast("عذراً، حدث خطأ أثناء مزامنة النقاط مع السيرفر السحابي. ❌");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // فحص حالة الجلسة السحابية فور تحميل البنية
  await checkUserSession();

  const firstCatItem = document.querySelector(".cat-item");
  if (firstCatItem) {
    changeCategory('creators', firstCatItem);
  }

  const userIdeaInput = document.getElementById("user-idea");
  if (userIdeaInput) {
    userIdeaInput.addEventListener("keypress", (event) => {
      if (event.key === 'Enter') generateProfessionalPrompt();
    });
  }
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.changeCategory = changeCategory;
window.generateProfessionalPrompt = generateProfessionalPrompt;
window.nextPrompt = nextPrompt;
window.prevPrompt = prevPrompt;
window.copyPrompt = copyPrompt;
window.shareResult = shareResult;