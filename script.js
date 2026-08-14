document.addEventListener("DOMContentLoaded", () => {
    

    // --- 2. نظام الشبكة (Canvas) ---
    const canvas = document.getElementById('network-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationFrameId;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.radius = Math.random() * 2 + 1;
                this.isOrange = Math.random() > 0.96; 
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }
            draw() {
                ctx.beginPath(); 
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.isOrange ? '#e6992d' : '#e6f1ff'; 
                ctx.fill();
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(136, 146, 176, ${1 - distance / 150})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        }

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const particleCount = window.innerWidth < 768 ? 30 : 50;
            particles = Array.from({ length: particleCount }, () => new Particle());
        };

        const canvasObserver = new IntersectionObserver(entries => {
            const [entry] = entries;
            if (entry.isIntersecting) {
                if (!animationFrameId) animationFrameId = requestAnimationFrame(animate);
            } else {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            }
        }, { threshold: 0 });

        window.addEventListener('resize', handleResize);
        handleResize(); 
        canvasObserver.observe(canvas);
    }
    
    // --- 3. نظام ظهور العناصر ---
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // --- 4. زر العودة للأعلى ---
    const btt = document.getElementById("backToTop");
    if(btt) {
        window.addEventListener('scroll', () => {
            btt.classList.toggle('visible', window.scrollY > 500);
        }, { passive: true });
        btt.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
    }

// --- معالجة نموذج التسجيل (نسخة مصلحة تمنع HTTP 405) ---
    const form = document.getElementById('ouamarkom-form');
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwazfFau-avk-PAN8GFi7vmxKFlZcm9lbrUNjzCb2MGBqloFxxZH0vKlJWeh1RBjNBw/exec";

    if (form) {
        const isArabic = document.documentElement.lang === 'ar' || document.dir === 'rtl';

        const i18n = {
            nameRequired: isArabic ? "يرجى إدخال اسمك الكامل" : "Please enter your full name",
            nameMinLength: isArabic ? "يجب أن يتكون الاسم من 3 أحرف على الأقل" : "Name must be at least 3 characters long",
            emailRequired: isArabic ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email address",
            emailInvalid: isArabic ? "صيغة البريد الإلكتروني غير صحيحة" : "Please enter a valid email address",
            interestRequired: isArabic ? "يرجى اختيار مسار الاهتمام" : "Please select a partnership track",
            submitting: isArabic ? "جاري تأمين مكانك..." : "Securing your spot...",
            serverError: isArabic ? "عذراً، حدث خطأ أثناء إرسال البيانات. يرجى المحاولة لاحقاً." : "Sorry, an error occurred. Please try again later."
        };

        const nameInput = form.elements['Full_Name'];
        const emailInput = form.elements['Email_Address'];
        const orgInput = form.elements['Organization'];
        const interestSelect = form.elements['Interest_Type'];
        const notesInput = form.elements['Notes'];

        const nameError = document.getElementById('name-error');
        const emailError = document.getElementById('email-error');
        const formError = document.getElementById('form-error');
        const btn = document.getElementById('submit-btn');
        const btnTextSpan = btn ? btn.querySelector('span') : null;

        const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // إلغاء إرسال HTML الافتراضي لسيرفر Live Server

            [nameError, emailError, formError].forEach(el => {
                if (el) { el.innerText = ''; el.style.opacity = '0'; }
            });
            [nameInput, emailInput, interestSelect].forEach(el => el && el.classList.remove('invalid'));

            let isValid = true;

            if (!nameInput.value.trim()) {
                if (nameError) { nameError.innerText = i18n.nameRequired; nameError.style.opacity = '1'; }
                nameInput.classList.add('invalid');
                isValid = false;
            } else if (nameInput.value.trim().length < 3) {
                if (nameError) { nameError.innerText = i18n.nameMinLength; nameError.style.opacity = '1'; }
                nameInput.classList.add('invalid');
                isValid = false;
            }

            if (!emailInput.value.trim()) {
                if (emailError) { emailError.innerText = i18n.emailRequired; emailError.style.opacity = '1'; }
                emailInput.classList.add('invalid');
                isValid = false;
            } else if (!isValidEmail(emailInput.value.trim())) {
                if (emailError) { emailError.innerText = i18n.emailInvalid; emailError.style.opacity = '1'; }
                emailInput.classList.add('invalid');
                isValid = false;
            }

            if (!interestSelect.value) {
                interestSelect.classList.add('invalid');
                isValid = false;
            }

            if (!isValid) return;

            const originalBtnText = btnTextSpan ? btnTextSpan.innerText : btn.innerText;
            if (btnTextSpan) btnTextSpan.innerText = i18n.submitting;
            else btn.innerText = i18n.submitting;
            btn.disabled = true;

            const payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                organization: orgInput ? orgInput.value.trim() : '',
                interest: interestSelect.value,
                notes: notesInput ? notesInput.value.trim() : '',
                language: isArabic ? 'ar' : 'en',
                timestamp: new Date().toISOString()
            };

            try {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' }, // يمنع إرسال طلب OPTIONS المسبب لـ 405
                    body: JSON.stringify(payload)
                });

                const wrapper = document.querySelector('.form-content-wrapper');
                const successMsg = document.getElementById('success-message');

                if (wrapper) wrapper.style.display = 'none';
                if (successMsg) {
                    successMsg.style.display = 'block';
                    successMsg.classList.add('visible');
                }

                document.getElementById('full-form-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
                form.reset();

            } catch (err) {
                if (formError) {
                    formError.innerText = i18n.serverError;
                    formError.style.opacity = '1';
                }
                btn.disabled = false;
                if (btnTextSpan) btnTextSpan.innerText = originalBtnText;
                else btn.innerText = originalBtnText;
            }
        });
    }

    // --- 6. ضمان ظهور العناصر في بداية الصفحة ---
    // هذا الكود يتأكد أن أي عنصر يظهر فور تحميل الصفحة (قبل التمرير) يتم تفعيله
    const checkFirstView = () => {
        document.querySelectorAll('.reveal').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                el.classList.add('active');
            }
        });
    };
    // تشغيل الفحص بعد 100 ملي ثانية لضمان استقرار التحميل
    setTimeout(checkFirstView, 100); 

    // --- 7. شريط تقدم القراءة (للمقالات المنفردة) ---
    // يظهر فقط في صفحات المقالات ليعطي طابعاً احترافياً
    if (window.location.pathname.includes('future-economy')) {
        const progressBar = document.createElement('div');
        // تنسيق الشريط: ثابت في الأعلى، لون ذهبي (accent)، طبقة علوية جداً
        progressBar.style = "position:fixed; top:0; right:0; height:4px; background:var(--accent); z-index:9999; transition: width 0.1s;";
        progressBar.id = "read-progress";
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + "%";
        }, { passive: true });
    }
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('section, .glass-card').forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
});


const hamburgerBtn = document.getElementById("hamburgerBtn");
const menuOverlay = document.getElementById("menuOverlay");

hamburgerBtn.addEventListener("click", () => {
    hamburgerBtn.classList.toggle("active");
    menuOverlay.classList.toggle("active");
});

menuOverlay.addEventListener("click", (e) => {
    if (e.target === menuOverlay) {
        hamburgerBtn.classList.remove("active");
        menuOverlay.classList.remove("active");
    }
});