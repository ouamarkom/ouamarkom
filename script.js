document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. العداد التنازلي ---
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        const launchDate = new Date('2026-06-01T00:00:00');
        const daysEl = document.getElementById('days'),
              hoursEl = document.getElementById('hours'),
              minutesEl = document.getElementById('minutes'),
              secondsEl = document.getElementById('seconds');

        const updateCountdown = () => {
            const diff = launchDate - new Date().getTime();

            if (diff <= 0) {
                clearInterval(timerInterval);
                timerEl.innerHTML = "<h4>تم الإطلاق! أهلاً بك في المستقبل.</h4>";
                return;
            }
            if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

            daysEl.innerText = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
            hoursEl.innerText = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            minutesEl.innerText = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            secondsEl.innerText = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
        };

        const timerInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
    }

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
            const particleCount = window.innerWidth < 768 ? 40 : 100;
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

    // --- 5. معالجة نموذج التسجيل ---
    const form = document.getElementById('ouamarkom-form');
    if(form) {
        const nameInput = form.elements['Full_Name'];
        const emailInput = form.elements['Email_Address'];
        const nameError = document.getElementById('name-error');
        const emailError = document.getElementById('email-error');
        const formError = document.getElementById('form-error');
        const btn = document.getElementById('submit-btn');

        form.addEventListener('submit', async (e) => {  
            e.preventDefault();
            
            [nameError, emailError, formError].forEach(el => el.style.opacity = '0');
            [nameInput, emailInput].forEach(el => el.classList.remove('invalid'));

            let isValid = true;
            if (nameInput.value.trim().length < 3) {
                nameError.innerText = "يرجى إدخال اسمك الكريم";
                nameError.style.opacity = '1';
                nameInput.classList.add('invalid');
                isValid = false;
            }
            if (!emailInput.validity.valid) {
                emailError.innerText = "البريد الإلكتروني غير صحيح";
                emailError.style.opacity = '1';
                emailInput.classList.add('invalid');
                isValid = false;
            }
            if (!isValid) return; 

            const originalBtnText = btn.innerText;
            btn.innerText = "جاري تأمين مكانك...";  
            btn.disabled = true;  

            try {
                const response = await fetch(form.action, {  
                    method: 'POST',  
                    body: new FormData(form),  
                    headers: {'Accept': 'application/json'}  
                });  

                if (response.ok) {  
                    document.querySelector('.form-content-wrapper').classList.add('hidden');
                    document.getElementById('success-message').classList.add('visible');
                    if (timerEl) timerEl.style.display = 'none';
                    document.getElementById('full-form-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    form.reset();
                } else {  
                    throw new Error('Server error');
                }
            } catch (err) {
                formError.innerText = "عذراً، حدث خطأ. يرجى المحاولة مجدداً بعد قليل.";
                formError.style.opacity = '1';
            } finally {
                if (!document.getElementById('success-message').classList.contains('visible')) {
                    btn.disabled = false;  
                    btn.innerText = originalBtnText;
                }
            }
        });
    }
});