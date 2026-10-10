(function () {
    'use strict';

    const hasGSAP = typeof gsap !== 'undefined';
    const hasThree = typeof THREE !== 'undefined';

    if (hasGSAP) {
        if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
        if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);
    }

    const WORD_POOL = [
        'intelligence',
        'innovative',
        'intellectual',
        'informative',
        'intermediate',
        'integrated',
        'internet',
        'insightful',
        'iterative'
    ];
    const LOADER_WORDS = [];
    const WORD_STEP = 0.24;
    const FINAL_LOCKUP_PAUSE = 0.18;
    const FINAL_HOLD = 0.24;
    const BAR_DURATION = 1.25;
    const LOADER_MIN_MS = 1500;
    const LOADER_MAX_MS = 2400;
    const WORD_SLOT_GAP_FACTOR = 0.16;

    let startTime = 0;
    let done = false;
    let activeWord = null;
    let wordWidths = new Map();
    let loaderAnimId = null;
    let loaderRenderer = null;
    let loaderCleanup = null;
    let barGlowTween = null;

    const EL = {
        overlay: document.getElementById('ld-overlay'),
        canvas: document.getElementById('ld-canvas'),
        center: document.getElementById('ld-center'),
        lockup: document.getElementById('ld-lockup'),
        brand: document.getElementById('ld-brand'),
        slot: document.getElementById('ld-slot'),
        slotInner: document.getElementById('ld-slot-inner'),
        company: document.getElementById('ld-company'),
        tagline: document.getElementById('ld-tagline'),
        barTrack: document.getElementById('ld-bar-track'),
        bar: document.getElementById('ld-bar'),
        barGlow: document.getElementById('ld-bar-glow'),
        header: document.querySelector('.site-header'),
        nav: document.querySelector('.site-nav'),
        navToggle: document.querySelector('.nav-toggle'),
        heroCanvas: document.getElementById('hero-canvas'),
        chat: {
            toggle: document.getElementById('chatToggle'),
            panel: document.getElementById('chatPanel'),
            close: document.getElementById('chatClose'),
            msgs: document.getElementById('chatMessages'),
            form: document.getElementById('chatForm'),
            input: document.getElementById('chatInput'),
            chips: document.querySelectorAll('.chat-chip'),
            typingTemplate: document.getElementById('chatTypingTemplate')
        },
        contact: {
            form: document.getElementById('contactForm'),
            status: document.getElementById('formStatus')
        },
        quick: {
            dock: document.getElementById('quickDock'),
            chatTrigger: document.getElementById('quickChatTrigger')
        }
    };

    function init() {
        if (!EL.overlay) {
            setupListeners();
            startHeroBg();
            revealContent();
            return;
        }

        startTime = Date.now();
        document.body.classList.add('is-loading');
        window.setTimeout(finishLoader, LOADER_MAX_MS);

        setupListeners();

        if (new URLSearchParams(window.location.search).has('skipLoader')) {
            done = true;
            if (EL.overlay) EL.overlay.style.display = 'none';
            document.body.classList.remove('is-loading');
            startHeroBg();
            revealContent();
            return;
        }

        if (!hasGSAP) {
            prepareLoader();
            skipLoader();
            return;
        }

        primeLoaderState();

        waitForFonts()
            .catch(function () { return null; })
            .then(function () {
                prepareLoader();
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    skipLoader();
                } else {
                    runLoader();
                }
            });
    }

    function primeLoaderState() {
        gsap.set(EL.overlay, { autoAlpha: 1 });
        if (EL.canvas) gsap.set(EL.canvas, { autoAlpha: 0 });
        gsap.set(EL.center, { y: 0, scale: 1, opacity: 1 });
        gsap.set(EL.brand, { autoAlpha: 0, y: 18, scale: 0.965, transformOrigin: 'center bottom' });
        gsap.set([EL.company, EL.tagline, EL.barTrack], { autoAlpha: 0, y: 12 });
        gsap.set(EL.bar, { scaleX: 0, transformOrigin: 'left center' });
        if (EL.barGlow) gsap.set(EL.barGlow, { xPercent: -150, autoAlpha: 0.74 });
    }

    function waitForFonts() {
        if (!document.fonts || !document.fonts.ready) return Promise.resolve();
        return Promise.race([
            document.fonts.ready,
            new Promise(function (resolve) { setTimeout(resolve, 1200); })
        ]);
    }

    function pickLoaderWords(pool, count) {
        if (!Array.isArray(pool) || !pool.length) return [];
        const total = Math.min(count, pool.length);
        const start = new Date().getDate() % pool.length;
        const picked = [];
        for (let i = 0; i < total; i += 1) {
            picked.push(pool[(start + i) % pool.length]);
        }
        return picked;
    }

    function prepareLoader() {
        if (!EL.slot || !EL.slotInner || !EL.brand) return;

        wordWidths = measureWordWidths(WORD_POOL.concat(['i']));
        const iWidth = wordWidths.get('i') || 18;

        EL.slot.style.width = iWidth + 'px';
        EL.slot.classList.remove('is-expanded');
        EL.slotInner.innerHTML = '';

        activeWord = createWordNode('i');
        EL.slotInner.appendChild(activeWord);

        if (hasGSAP) {
            gsap.set(activeWord, { y: 0, opacity: 1 });
            gsap.set(EL.brand, { scale: 1 });
        }
    }

    function measureWordWidths(words) {
        const widths = new Map();
        if (!EL.brand || !document.body) return widths;

        const brandStyles = window.getComputedStyle(EL.brand);
        const probeStage = document.createElement('span');
        const probe = document.createElement('span');
        probeStage.style.position = 'fixed';
        probeStage.style.left = '-9999px';
        probeStage.style.top = '-9999px';
        probeStage.style.visibility = 'hidden';
        probeStage.style.whiteSpace = 'nowrap';
        probeStage.style.pointerEvents = 'none';
        probeStage.style.zIndex = '-1';
        probeStage.style.fontFamily = brandStyles.fontFamily;
        probeStage.style.fontSize = brandStyles.fontSize;
        probeStage.style.fontWeight = brandStyles.fontWeight;
        probeStage.style.lineHeight = brandStyles.lineHeight;
        probeStage.style.letterSpacing = brandStyles.letterSpacing;

        probe.style.transform = 'none';
        probe.style.opacity = '1';
        probe.style.filter = 'none';

        probeStage.appendChild(probe);
        document.body.appendChild(probeStage);

        words.forEach(function (word) {
            probe.className = 'ld-word' + (word === 'i' ? ' ld-word-letter' : '');
            probe.textContent = word;
            widths.set(word, Math.ceil(probe.getBoundingClientRect().width));
        });

        document.body.removeChild(probeStage);
        return widths;
    }

    function createWordNode(text) {
        const word = document.createElement('span');
        word.className = 'ld-word' + (text === 'i' ? ' ld-word-letter' : ' ld-word-expanded');
        word.textContent = text;
        word.setAttribute('aria-hidden', 'true');
        return word;
    }

    function transitionWord(word) {
        if (!EL.slot || !EL.slotInner || !hasGSAP) return;

        const outgoing = activeWord;
        const incoming = createWordNode(word);
        const brandFontSize = parseFloat(getComputedStyle(EL.brand).fontSize) || 80;
        const slotGap = word === 'i' ? 0 : Math.round(brandFontSize * WORD_SLOT_GAP_FACTOR);
        const targetWidth = (wordWidths.get(word) || wordWidths.get('i') || 18) + slotGap;
        const incomingStart = word === 'i' ? 18 : 14;
        const outgoingEnd = word === 'i' ? -12 : -10;

        EL.slot.classList.toggle('is-expanded', word !== 'i');

        EL.slotInner.appendChild(incoming);

        gsap.set(incoming, { y: incomingStart, opacity: 0 });
        gsap.killTweensOf([EL.slot].concat(outgoing ? [outgoing] : [], [incoming]));

        const wordTl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

        wordTl.to(EL.slot, {
            width: targetWidth,
            duration: 0.42
        }, 0);

        if (outgoing) {
            wordTl.to(outgoing, {
                y: outgoingEnd,
                opacity: 0,
                duration: 0.26
            }, 0);
        }

        wordTl.to(incoming, {
            y: 0,
            opacity: 1,
            duration: 0.34
        }, 0.05);

        wordTl.call(function () {
            if (outgoing && outgoing.parentNode) outgoing.parentNode.removeChild(outgoing);
            activeWord = incoming;
        }, null, 0.46);
    }

    function startBarAccent() {
        if (!hasGSAP || !EL.barGlow) return;
        if (barGlowTween) barGlowTween.kill();
        gsap.set(EL.barGlow, { xPercent: -135, autoAlpha: 0.58 });
        barGlowTween = gsap.to(EL.barGlow, {
            xPercent: 560,
            duration: 1.8,
            ease: 'none',
            repeat: -1
        });
    }

    function stopBarAccent() {
        if (barGlowTween) {
            barGlowTween.kill();
            barGlowTween = null;
        }
    }

    function runLoader() {
        if (!EL.brand || !EL.slot || !EL.slotInner || !EL.bar) { finishLoader(); return; }

        let cursor = 0.82;
        const loaderTimeline = gsap.timeline({ onComplete: finishLoader });

        loaderTimeline.to(EL.brand, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.86,
            ease: 'power3.out'
        }, 0);

        loaderTimeline.to(EL.barTrack, {
            autoAlpha: 1,
            y: 0,
            duration: 0.52,
            ease: 'power2.out'
        }, 0.28);

        loaderTimeline.call(startBarAccent, null, 0.36);

        loaderTimeline.to(EL.bar, {
            scaleX: 1,
            duration: BAR_DURATION,
            ease: 'power2.inOut'
        }, 0.54);

        LOADER_WORDS.forEach(function (word) {
            loaderTimeline.call(function () {
                transitionWord(word);
            }, null, cursor);
            cursor += WORD_STEP;
        });

        loaderTimeline.call(function () {
            transitionWord('i');
        }, null, cursor);
        cursor += FINAL_LOCKUP_PAUSE;

        loaderTimeline.to(EL.company, {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out'
        }, cursor);

        loaderTimeline.to(EL.tagline, {
            autoAlpha: 1,
            y: 0,
            duration: 0.46,
            ease: 'power2.out'
        }, cursor + 0.16);

        loaderTimeline.to({}, { duration: FINAL_HOLD }, cursor + 0.64);
    }

    function skipLoader() {
        if (!EL.slotInner) {
            finishLoader();
            return;
        }

        EL.slotInner.innerHTML = '';
        EL.slot.classList.remove('is-expanded');
        activeWord = createWordNode('i');
        EL.slotInner.appendChild(activeWord);

        if (hasGSAP) {
            gsap.set([EL.brand, EL.company, EL.tagline, EL.barTrack], { autoAlpha: 1, y: 0, scale: 1 });
            gsap.set(EL.bar, { scaleX: 1 });
            if (EL.barGlow) gsap.set(EL.barGlow, { autoAlpha: 0.72 });
            gsap.set(activeWord, { y: 0, opacity: 1 });
        } else {
            [EL.brand, EL.company, EL.tagline, EL.barTrack].forEach(function (el) {
                if (el) {
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                }
            });
            if (EL.bar) EL.bar.style.transform = 'scaleX(1)';
        }
        setTimeout(finishLoader, 900);
    }

    function finishLoader() {
        if (done) return;
        done = true;

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, LOADER_MIN_MS - elapsed);

        setTimeout(function () {
            stopBarAccent();
            if (hasGSAP && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && EL.overlay) {
                document.body.classList.remove('is-loading');

                gsap.timeline({ onComplete: afterLoader })
                    .to(EL.center, {
                        y: -10,
                        scale: 0.985,
                        duration: 0.68,
                        ease: 'power2.inOut'
                    }, 0)
                    .to(EL.overlay, {
                        autoAlpha: 0,
                        duration: 0.72,
                        ease: 'power2.inOut'
                    }, 0.02);
            } else {
                document.body.classList.remove('is-loading');
                if (EL.overlay) EL.overlay.style.display = 'none';
                afterLoader();
            }
        }, remaining);
    }

    function afterLoader() {
        if (EL.overlay) EL.overlay.style.display = 'none';
        stopLoaderBg();
        startHeroBg();
        revealContent();
    }

    function startLoaderBg() {
        return;
        const canvas = EL.canvas;
        if (!canvas || !hasThree) return;
        if (loaderRenderer) return;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0.1, 8.5);

        scene.add(new THREE.AmbientLight(0xf5f4ff, 2.2));

        const keyLight = new THREE.DirectionalLight(0xc7dae6, 1.3);
        keyLight.position.set(3.8, 4.5, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xd8c9ff, 0.9);
        fillLight.position.set(-4, -1.8, 3);
        scene.add(fillLight);

        const group = new THREE.Group();
        scene.add(group);

        const orbMaterialA = new THREE.MeshPhysicalMaterial({
            color: 0x6e8da5,
            transparent: true,
            opacity: 0.16,
            roughness: 0.22,
            metalness: 0.06,
            clearcoat: 0.68
        });
        const orbMaterialB = new THREE.MeshPhysicalMaterial({
            color: 0xa78bff,
            transparent: true,
            opacity: 0.12,
            roughness: 0.32,
            metalness: 0.02,
            clearcoat: 0.55
        });

        const sphereA = new THREE.Mesh(new THREE.SphereGeometry(1.28, 32, 32), orbMaterialA);
        sphereA.position.set(-2.5, 1.1, -0.8);

        const sphereB = new THREE.Mesh(new THREE.SphereGeometry(0.82, 28, 28), orbMaterialB);
        sphereB.position.set(2.8, -1.45, -0.4);

        const torus = new THREE.Mesh(
            new THREE.TorusGeometry(1.24, 0.09, 18, 88),
            new THREE.MeshPhysicalMaterial({
                color: 0x93adbf,
                transparent: true,
                opacity: 0.14,
                roughness: 0.18,
                metalness: 0.1,
                clearcoat: 0.9
            })
        );
        torus.position.set(1.05, 1.58, -1.7);
        torus.rotation.x = 0.92;

        group.add(sphereA, sphereB, torus);

        const particleCount = 140;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i += 1) {
            positions[i * 3] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
            positions[i * 3 + 2] = -Math.random() * 3.4;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x88a4ba,
            transparent: true,
            opacity: 0.22,
            size: 0.05,
            sizeAttenuation: true
        });
        const particles = new THREE.Points(particleGeo, particleMaterial);
        scene.add(particles);

        const pointer = { x: 0, y: 0 };
        const clock = new THREE.Clock();

        function onPointerMove(event) {
            const bounds = canvas.getBoundingClientRect();
            pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.4;
            pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.28;
        }

        function onResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        canvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('resize', onResize);

        (function animate() {
            loaderAnimId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            sphereA.position.y = 1.1 + Math.sin(t * 0.34) * 0.18;
            sphereB.position.y = -1.45 + Math.cos(t * 0.28) * 0.16;
            torus.rotation.z = Math.sin(t * 0.18) * 0.24;
            group.rotation.y += (pointer.x - group.rotation.y) * 0.025;
            group.rotation.x += (-pointer.y - group.rotation.x) * 0.025;
            particles.rotation.z = t * 0.014;
            renderer.render(scene, camera);
        })();

        loaderRenderer = renderer;
        loaderCleanup = function () {
            canvas.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('resize', onResize);
            particleGeo.dispose();
            particleMaterial.dispose();
            orbMaterialA.dispose();
            orbMaterialB.dispose();
            torus.material.dispose();
            sphereA.geometry.dispose();
            sphereB.geometry.dispose();
            torus.geometry.dispose();
        };
    }

    function stopLoaderBg() {
        if (loaderAnimId) {
            cancelAnimationFrame(loaderAnimId);
            loaderAnimId = null;
        }
        if (loaderCleanup) {
            loaderCleanup();
            loaderCleanup = null;
        }
        if (loaderRenderer) {
            loaderRenderer.dispose();
            loaderRenderer = null;
        }
    }

    function revealContent() {
        if (!hasGSAP || typeof ScrollTrigger === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        gsap.utils.toArray('[data-reveal]').forEach(function (el) {
            gsap.fromTo(el,
                { y: 18, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.58, ease: 'power2.out',
                    scrollTrigger: { trigger: el, start: 'top 85%' }
                }
            );
        });
    }

    function startHeroBg() {
        const canvas = EL.heroCanvas;
        if (!canvas || !hasThree) return;
        if (canvas.querySelector('canvas')) return;

        const W = canvas.clientWidth, H = canvas.clientHeight;
        if (!W || !H) return;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.setSize(W, H);
        canvas.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.set(0, 0.1, 7);

        scene.add(new THREE.AmbientLight(0xf6f5ff, 2.2));
        const dir = new THREE.DirectionalLight(0xaec3d2, 2.8);
        dir.position.set(3, 4, 5);
        scene.add(dir);

        const group = new THREE.Group();
        scene.add(group);

        const m1 = new THREE.MeshPhysicalMaterial({ color: 0x58718a, transparent: true, opacity: 0.34, roughness: 0.18, metalness: 0.12, clearcoat: 0.9 });
        const m2 = new THREE.MeshPhysicalMaterial({ color: 0x9d7ff1, transparent: true, opacity: 0.24, roughness: 0.26, metalness: 0.08, clearcoat: 0.75 });

        const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), m1);
        sphere.position.set(-1.9, 0.8, -0.2);
        const torus = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.2, 18, 64), m2);
        torus.position.set(1.75, -0.6, 0.2);
        group.add(sphere, torus);

        const clock = new THREE.Clock();
        const pointer = { x: 0, y: 0 };
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

        canvas.addEventListener('pointermove', function (e) {
            const b = canvas.getBoundingClientRect();
            pointer.x = ((e.clientX - b.left) / b.width - 0.5) * 0.4;
            pointer.y = ((e.clientY - b.top) / b.height - 0.5) * 0.35;
        });

        (function animate() {
            requestAnimationFrame(animate);
            if (!reduced.matches) {
                const t = clock.getElapsedTime();
                sphere.rotation.x = t * 0.18;
                sphere.rotation.y = t * 0.22;
                torus.rotation.x = 0.8 + t * 0.12;
                group.rotation.y += (pointer.x - group.rotation.y) * 0.02;
                group.rotation.x += (-pointer.y - group.rotation.x) * 0.02;
            }
            renderer.render(scene, camera);
        })();

        window.addEventListener('resize', function () {
            const nw = canvas.clientWidth, nh = canvas.clientHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        });
    }

    function setupListeners() {
        if (EL.navToggle && EL.nav) {
            EL.navToggle.addEventListener('click', function () {
                const open = EL.nav.classList.toggle('is-open');
                EL.navToggle.setAttribute('aria-expanded', open);
            });
        }

        document.querySelectorAll('[data-scroll]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (!target) return;
                if (EL.nav) EL.nav.classList.remove('is-open');
                const offset = EL.header ? EL.header.offsetHeight + 20 : 80;
                if (hasGSAP && typeof ScrollToPlugin !== 'undefined') {
                    gsap.to(window, { duration: 1, scrollTo: { y: target, offsetY: offset }, ease: 'power2.inOut' });
                } else {
                    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
                }
            });
        });

        window.addEventListener('scroll', function () {
            if (EL.header) EL.header.classList.toggle('is-scrolled', window.scrollY > 20);
        }, { passive: true });

        initHeroAccents();
        initHeroCinematic();
        initVideoSlot();
        initUnicornScene();
        initExperienceStage();
        initAmbientMotion();
        initInteractiveCards();
        initFaq();
        initBookingHelpers();
        initQuickDock();
        setupChatbot();
        setupFormHandlers();
    }

    function initHeroAccents() {
        const hero = document.querySelector('.hero-section');
        const objects = hero ? hero.querySelectorAll('.hero-depth-system > span, .hero-objects > span') : [];
        if (!hero || !objects.length || !hasGSAP || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        objects.forEach(function (obj, index) {
            gsap.to(obj, {
                y: index % 2 === 0 ? -12 : 12,
                x: index % 2 === 0 ? 10 : -10,
                duration: 4.8 + (index * 0.7),
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        });

        hero.addEventListener('pointermove', function (event) {
            const bounds = hero.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;

            objects.forEach(function (obj, index) {
                gsap.to(obj, {
                    xPercent: x * (index + 1) * 10,
                    yPercent: y * (index + 1) * 10,
                    duration: 0.9,
                    ease: 'power3.out',
                    overwrite: 'auto'
                });
            });
        });

        hero.addEventListener('pointerleave', function () {
            objects.forEach(function (obj) {
                gsap.to(obj, {
                    xPercent: 0,
                    yPercent: 0,
                    duration: 0.8,
                    ease: 'power3.out',
                    overwrite: 'auto'
                });
            });
        });
    }

    function initHeroCinematic() {
        const hero = document.querySelector('.hero-cinematic');
        if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const titleLines = hero.querySelectorAll('.hero-title-line');
        const introItems = hero.querySelectorAll('.hero-eyebrow, .hero-tagline, .hero-lead, .hero-actions, .hero-signal');
        const visual = hero.querySelector('.hero-visual-system');
        const depthItems = hero.querySelectorAll('.depth-plane, .depth-line, .depth-grid');

        if (hasGSAP) {
            gsap.timeline({ defaults: { ease: 'power3.out' } })
                .fromTo(titleLines, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.78, stagger: 0.08 }, 0.08)
                .fromTo(introItems, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58, stagger: 0.055 }, 0.24)
                .fromTo(visual, { y: 26, opacity: 0, rotateX: 4 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.84 }, 0.18);

            if (typeof ScrollTrigger !== 'undefined') {
                gsap.to(visual, {
                    yPercent: -7,
                    ease: 'none',
                    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.7 }
                });
                gsap.to(depthItems, {
                    yPercent: -14,
                    ease: 'none',
                    stagger: 0.04,
                    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.9 }
                });
            }
        } else {
            hero.classList.add('is-hero-ready');
        }
    }

    function initVideoSlot() {
        const video = document.getElementById('brandVideo');
        if (!video) return;

        const frame = video.closest('.hero-video-frame');
        const src = video.dataset.videoSrc || '';
        if (!src) {
            if (frame) frame.classList.add('is-video-fallback');
            return;
        }

        video.src = src;
        video.addEventListener('loadeddata', function () {
            if (frame) frame.classList.add('is-video-ready');
            video.play().catch(function () { return null; });
        }, { once: true });

        video.addEventListener('pointerenter', function () {
            if (!video.paused) video.pause();
        });

        video.addEventListener('pointerleave', function () {
            video.play().catch(function () { return null; });
        });

        video.load();
    }

    function initUnicornScene() {
        const hero = document.querySelector('.unicorn-hero');
        const scene = document.getElementById('unicornScene');
        if (!hero || !scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const field = document.getElementById('unicornField');
        const movingParts = scene.querySelectorAll('.studio-orb, .studio-logo-card, .studio-preview-card, .scene-panels article');

        if (hasGSAP) {
            gsap.fromTo(
                hero.querySelectorAll('.hero-eyebrow, .unicorn-copy h1, .hero-lead, .hero-actions, .hero-proof-row'),
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 0.72, stagger: 0.07, ease: 'power3.out', delay: 0.12 }
            );
            gsap.fromTo(scene, { opacity: 0, y: 28, rotateX: 5 }, { opacity: 1, y: 0, rotateX: 0, duration: 0.9, ease: 'power3.out', delay: 0.22 });
        }

        hero.addEventListener('pointermove', function (event) {
            const bounds = hero.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;

            scene.style.setProperty('--scene-x', (x * 18).toFixed(2) + 'px');
            scene.style.setProperty('--scene-y', (y * 18).toFixed(2) + 'px');
            scene.style.setProperty('--scene-rx', (-y * 5).toFixed(2) + 'deg');
            scene.style.setProperty('--scene-ry', (x * 6).toFixed(2) + 'deg');
            if (field) {
                field.style.setProperty('--field-x', (x * 26).toFixed(2) + 'px');
                field.style.setProperty('--field-y', (y * 26).toFixed(2) + 'px');
            }
        });

        hero.addEventListener('pointerleave', function () {
            scene.style.setProperty('--scene-x', '0px');
            scene.style.setProperty('--scene-y', '0px');
            scene.style.setProperty('--scene-rx', '0deg');
            scene.style.setProperty('--scene-ry', '0deg');
            if (field) {
                field.style.setProperty('--field-x', '0px');
                field.style.setProperty('--field-y', '0px');
            }
        });

        movingParts.forEach(function (part, index) {
            part.style.setProperty('--float-delay', (index * 0.16).toFixed(2) + 's');
        });
    }

    function initExperienceStage() {
        const stage = document.getElementById('experienceStage');
        if (!stage) return;

        const orbit = stage.querySelector('.signal-orbit');
        const nodes = stage.querySelectorAll('.signal-node');
        const panels = stage.querySelectorAll('.signal-panel');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (hasGSAP && !reduced) {
            if (orbit) {
                gsap.to(orbit.querySelector('.signal-ring-one'), {
                    rotation: 360,
                    transformOrigin: '50% 50%',
                    duration: 28,
                    repeat: -1,
                    ease: 'none'
                });

                gsap.to(orbit.querySelector('.signal-ring-two'), {
                    rotation: -360,
                    transformOrigin: '50% 50%',
                    duration: 36,
                    repeat: -1,
                    ease: 'none'
                });
            }

            nodes.forEach(function (node, index) {
                gsap.to(node, {
                    scale: 1.06,
                    opacity: 0.86,
                    duration: 2.6 + index * 0.24,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });
            });

            panels.forEach(function (panel, index) {
                gsap.fromTo(panel, {
                    y: 18,
                    opacity: 0
                }, {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    delay: 0.08 * index,
                    ease: 'power3.out',
                    scrollTrigger: typeof ScrollTrigger !== 'undefined'
                        ? { trigger: stage, start: 'top 82%' }
                        : undefined
                });
            });
        }

        if (!window.matchMedia('(pointer: fine)').matches) return;

        let frame = null;
        let next = null;

        function flush() {
            frame = null;
            if (!next) return;
            stage.style.setProperty('--card-shift-x', next.shiftX + 'px');
            stage.style.setProperty('--card-shift-y', next.shiftY + 'px');
            stage.style.setProperty('--card-rotate-x', next.rotateX + 'deg');
            stage.style.setProperty('--card-rotate-y', next.rotateY + 'deg');
            next = null;
        }

        function reset() {
            next = { shiftX: 0, shiftY: 0, rotateX: 0, rotateY: 0 };
            if (!frame) frame = requestAnimationFrame(flush);
        }

        stage.addEventListener('pointermove', function (event) {
            const bounds = stage.getBoundingClientRect();
            const px = (event.clientX - bounds.left) / bounds.width - 0.5;
            const py = (event.clientY - bounds.top) / bounds.height - 0.5;

            next = {
                shiftX: px * 3,
                shiftY: py * 3,
                rotateX: py * -2.5,
                rotateY: px * 2.5
            };

            if (!frame) frame = requestAnimationFrame(flush);
        });

        stage.addEventListener('pointerleave', reset);
        stage.addEventListener('pointercancel', reset);
    }

    function initAmbientMotion() {
        return;
    }

    function initInteractiveCards() {
        const allowDepth = window.matchMedia('(pointer: fine)').matches
            && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!allowDepth) return;

        const cards = document.querySelectorAll(
            '.hero-signal, .system-card, .about-founder, .about-story, .brand-principles, .service-card, .project-card, .team-card, .team-roadmap, .skills-panel, .trust-item, .contact-point, .contact-form'
        );

        cards.forEach(function (card) {
            let frame = null;
            let nextState = null;

            function flush() {
                frame = null;
                if (!nextState) return;
                card.style.setProperty('--card-shift-x', nextState.shiftX + 'px');
                card.style.setProperty('--card-shift-y', nextState.shiftY + 'px');
                card.style.setProperty('--card-rotate-x', nextState.rotateX + 'deg');
                card.style.setProperty('--card-rotate-y', nextState.rotateY + 'deg');
                nextState = null;
            }

            function resetCard() {
                nextState = {
                    shiftX: 0,
                    shiftY: 0,
                    rotateX: 0,
                    rotateY: 0
                };

                if (!frame) frame = requestAnimationFrame(flush);
            }

            card.addEventListener('pointermove', function (event) {
                if (event.pointerType === 'touch') return;

                const bounds = card.getBoundingClientRect();
                const px = (event.clientX - bounds.left) / bounds.width - 0.5;
                const py = (event.clientY - bounds.top) / bounds.height - 0.5;

                nextState = {
                    shiftX: px * 1.5,
                    shiftY: py * 2,
                    rotateX: py * -2.5,
                    rotateY: px * 3
                };

                if (!frame) frame = requestAnimationFrame(flush);
            });

            card.addEventListener('pointerleave', resetCard);
            card.addEventListener('pointercancel', resetCard);
            card.addEventListener('blur', resetCard, true);
        });
    }

    function initQuickDock() {
        if (!EL.quick.dock) return;

        const links = Array.from(EL.quick.dock.querySelectorAll('a.quick-dock-link[href^="#"]'));
        const targets = links
            .map(function (link) {
                const selector = link.getAttribute('href');
                return { link: link, target: selector ? document.querySelector(selector) : null };
            })
            .filter(function (item) { return Boolean(item.target); });

        function syncQuickDock() {
            if (!EL.quick.dock) return;

            const offset = (EL.header ? EL.header.offsetHeight : 0) + 180;
            const marker = window.scrollY + offset;
            let activeItem = targets[0] || null;

            targets.forEach(function (item) {
                if (item.target.offsetTop <= marker) activeItem = item;
            });

            links.forEach(function (link) {
                link.classList.toggle('is-active', Boolean(activeItem) && activeItem.link === link);
            });
        }

        syncQuickDock();
        window.addEventListener('scroll', syncQuickDock, { passive: true });
        window.addEventListener('resize', syncQuickDock);
    }

    function initFaq() {
        const items = document.querySelectorAll('.faq-item');
        if (!items.length) return;

        items.forEach(function (item) {
            item.addEventListener('toggle', function () {
                if (!item.open) return;
                items.forEach(function (other) {
                    if (other !== item) other.open = false;
                });
            });
        });
    }

    function initBookingHelpers() {
        const bookingLinks = document.querySelectorAll('[data-booking-target]');
        if (!bookingLinks.length) return;

        bookingLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                window.setTimeout(function () {
                    if (EL.contact.form) {
                        const service = EL.contact.form.querySelector('#service');
                        const message = EL.contact.form.querySelector('#message');
                        if (service && !service.value) service.value = 'Web Development';
                        if (message && !message.value) {
                            message.value = 'I would like to book a consultation to discuss my project goals.';
                        }
                        if (message) message.focus();
                    }
                }, 900);
            });
        });
    }

    function setupChatbot() {
        const answers = {
            founder: 'AiSL Consultancy is led by Savinay Kumar Soni — Student, Developer, and AI Enthusiast.',
            services: 'Services include AI Assistant Development, Smart Scheduling Systems, Web Development, Automation Solutions, Workflow Prototyping, and Technical Research & Documentation.',
            projects: 'Current project examples include AI assistants, smart scheduling concepts, professional web presence builds, and workflow automation trackers.',
            vision: 'AiSL is service-led today, with a larger venture direction around intelligent systems, structured digital workflows, and scalable execution.',
            contact: 'Use the contact form on this page to reach the founder directly.',
            default: 'Ask me about the founder, services, projects, or contact.'
        };

        function addMsg(text, isUser) {
            if (!EL.chat.msgs) return;
            const div = document.createElement('div');
            div.className = 'chat-message ' + (isUser ? 'user' : 'bot');
            div.textContent = text;
            EL.chat.msgs.appendChild(div);
            EL.chat.msgs.scrollTop = EL.chat.msgs.scrollHeight;
        }

        function showTyping() {
            if (!EL.chat.msgs) return function () { };

            const node = EL.chat.typingTemplate
                ? EL.chat.typingTemplate.content.firstElementChild.cloneNode(true)
                : document.createElement('div');

            if (!node.classList.contains('chat-typing')) {
                node.className = 'chat-message bot chat-typing';
                node.innerHTML = '<span></span><span></span><span></span>';
            }

            EL.chat.msgs.appendChild(node);
            EL.chat.msgs.scrollTop = EL.chat.msgs.scrollHeight;

            return function removeTyping() {
                if (node.parentNode) node.parentNode.removeChild(node);
            };
        }

        function queueBotReply(text) {
            const removeTyping = showTyping();
            setTimeout(function () {
                removeTyping();
                addMsg(text, false);
            }, 520);
        }

        function getAnswer(input) {
            const text = String(input || '').toLowerCase();
            if (text.includes('founder') || text.includes('ceo') || text.includes('savinay')) return answers.founder;
            if (text.includes('service') || text.includes('offer') || text.includes('expertise')) return answers.services;
            if (text.includes('project') || text.includes('work') || text.includes('portfolio')) return answers.projects;
            if (text.includes('contact') || text.includes('email') || text.includes('reach') || text.includes('book')) return answers.contact;
            if (text.includes('vision') || text.includes('future') || text.includes('goal')) return answers.vision;
            return answers.default;
        }

        function setChatState(open) {
            if (!EL.chat.panel) return;
            EL.chat.panel.classList.toggle('is-open', open);
            if (EL.chat.toggle) EL.chat.toggle.setAttribute('aria-expanded', String(open));
            if (EL.quick.chatTrigger) EL.quick.chatTrigger.setAttribute('aria-expanded', String(open));
            if (open && EL.chat.input) EL.chat.input.focus();
            syncChatDockState();
        }

        function syncChatDockState() {
            if (!EL.chat.panel) return;
            if (EL.chat.toggle) EL.chat.toggle.classList.remove('is-docked-hidden');
            if (EL.quick.dock) EL.quick.dock.classList.remove('is-hidden');
        }

        if (EL.chat.msgs && !EL.chat.msgs.children.length) {
            addMsg('Ask about the founder, services, projects, or how to begin.', false);
        }

        if (EL.chat.toggle && EL.chat.panel) {
            EL.chat.toggle.addEventListener('click', function () {
                setChatState(!EL.chat.panel.classList.contains('is-open'));
            });
        }

        if (EL.quick.chatTrigger && EL.chat.panel) {
            EL.quick.chatTrigger.addEventListener('click', function () {
                setChatState(!EL.chat.panel.classList.contains('is-open'));
            });
        }

        if (EL.chat.close && EL.chat.panel) {
            EL.chat.close.addEventListener('click', function () {
                setChatState(false);
            });
        }

        EL.chat.chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                const topic = chip.dataset.chatTopic || 'default';
                const prompt = chip.textContent.trim();
                addMsg(prompt, true);
                queueBotReply(answers[topic] || getAnswer(prompt));
            });
        });

        if (EL.chat.form && EL.chat.input) {
            EL.chat.form.addEventListener('submit', function (event) {
                event.preventDefault();
                const question = EL.chat.input.value.trim();
                if (!question) return;

                addMsg(question, true);
                EL.chat.input.value = '';

                queueBotReply(getAnswer(question));
            });
        }

        syncChatDockState();
        window.addEventListener('scroll', syncChatDockState, { passive: true });
        window.addEventListener('resize', syncChatDockState);
    }

    async function sendFormData(data, statusElement, formElement) {
        if (!statusElement) return;

        if (!data.name || !data.email || !data.message || !/^\S+@\S+\.\S+$/.test(data.email)) {
            statusElement.innerText = 'Please complete the form with a valid email address.';
            return;
        }

        statusElement.innerText = 'Preparing your brief...';

        try {
            const payload = {
                name: data.name,
                email: data.email,
                role: data.role || '',
                service: data.service || '',
                message: data.message,
                capturedAt: new Date().toISOString()
            };

            window.localStorage.setItem('aisl:last-enquiry', JSON.stringify(payload));
            await new Promise(function (resolve) { window.setTimeout(resolve, 520); });

            statusElement.innerText = 'Thanks. Your brief is captured and ready for the live app workflow.';
            if (formElement) formElement.reset();
        } catch (error) {
            console.error(error);
            statusElement.innerText = 'Something interrupted the save. Please try once more.';
        }
    }

    function setupFormHandlers() {
        const contactForm = document.getElementById("contactForm");
        const contactStatus = document.getElementById("formStatus");

        if (contactForm) {
            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");
            const messageInput = document.getElementById("message");

            contactForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                if (!nameInput || !emailInput || !messageInput) return;

                const data = {
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    role: document.getElementById('role') ? document.getElementById('role').value : '',
                    service: document.getElementById('service') ? document.getElementById('service').value : '',
                    message: messageInput.value.trim()
                };

                await sendFormData(data, contactStatus, contactForm);
            });
        }
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();
