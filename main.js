import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   AiSL — ADAPTIVE MATTER TYPOGRAPHY ENGINE
   The wordmark IS the hero. Living computational material.
   ═══════════════════════════════════════════════════════════════ */

// ── SIMPLEX NOISE (atmospheric background only) ───────────────
const SNOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
    +i.y+vec4(0.,i1.y,i2.y,1.))
    +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// ── ATMOSPHERIC VOID SHADER ───────────────────────────────────
const vertShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`;
const fragShader = `
${SNOISE}
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  vec2 m=uMouse*.04;
  float n1=snoise(vec3(uv*1.2+m,uTime*.008));
  float n2=snoise(vec3(uv*2.0-m*.3,uTime*.005+5.));
  float n=(n1+n2*.3)/1.3;
  n=(n+1.)*.5;
  vec3 base=vec3(.028,.034,.045);
  vec3 deep=vec3(.052,.069,.096);
  vec3 col=mix(base,deep,smoothstep(.2,.85,n));
  gl_FragColor=vec4(col,1.);
}`;

// ── THREE.JS CORE ─────────────────────────────────────────────
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x070b11, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070b11, 0.015);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 14;

const sceneGroup = new THREE.Group();
scene.add(sceneGroup);
const heroVideo = document.getElementById('heroVideo');
const heroStage = document.getElementById('unicornScene');

// Background atmosphere
const bgGeo = new THREE.PlaneGeometry(50, 50);
const bgMat = new THREE.ShaderMaterial({
    vertexShader: vertShader,
    fragmentShader: fragShader,
    uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() } },
    depthWrite: false, depthTest: false
});
const bgPlane = new THREE.Mesh(bgGeo, bgMat);
bgPlane.position.z = -20;
scene.add(bgPlane);

// Subtle directional lighting for depth on slices
const ambientLight = new THREE.AmbientLight(0xf3f0ea, 0.3);
sceneGroup.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xe4ebf5, 0.36);
keyLight.position.set(4, 5, 10);
sceneGroup.add(keyLight);

const rimLight = new THREE.PointLight(0x8fb7ff, 1.35, 22);
rimLight.position.set(0, 0, -4);
sceneGroup.add(rimLight);

// ── TEXT → SLICE SAMPLING ─────────────────────────────────────
function sampleTextToSlices(text, fontFamily, fontSize, sliceStep) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');

    const fontStr = `800 ${fontSize}px ${fontFamily}, sans-serif`;
    ctx.font = fontStr;
    const tm = ctx.measureText(text);

    c.width = Math.ceil(tm.width) + 40;
    c.height = Math.ceil(fontSize * 1.3);

    // Re-apply font after canvas resize
    ctx.font = fontStr;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 20, fontSize * 0.08);

    const id = ctx.getImageData(0, 0, c.width, c.height);
    const px = id.data;
    const cw = c.width;
    const ch = c.height;
    const slices = [];

    for (let y = 0; y < ch; y += sliceStep) {
        let inSpan = false, sx = 0;
        for (let x = 0; x < cw; x++) {
            const a = px[(y * cw + x) * 4 + 3];
            if (a > 50 && !inSpan) { inSpan = true; sx = x; }
            else if (a <= 50 && inSpan) {
                inSpan = false;
                if (x - sx > 3) slices.push({ row: y, x: sx, w: x - sx });
            }
        }
        if (inSpan && cw - sx > 3) slices.push({ row: y, x: sx, w: cw - sx });
    }
    return { slices, cw, ch };
}

// ── BUILD ADAPTIVE MATTER OBJECT ──────────────────────────────
const sliceMeshes = [];
let sliceGroup = null;
let assembled = false;

function positionAdaptiveMatter() {
    if (!sliceGroup) return;

    const isDesktop = innerWidth >= 1180;
    const isTablet = innerWidth >= 820 && innerWidth < 1180;

    if (isDesktop) {
        sliceGroup.position.set(-1.25, 1.05, 0);
        sliceGroup.scale.set(0.58, 0.58, 0.58);
    } else if (isTablet) {
        sliceGroup.position.set(-0.2, 0.95, 0);
        sliceGroup.scale.set(0.52, 0.52, 0.52);
    } else {
        sliceGroup.position.set(0, 0.88, 0);
        sliceGroup.scale.set(0.42, 0.42, 0.42);
    }
}

async function buildAdaptiveMatter() {
    // Wait for Sora font
    if (document.fonts) {
        await Promise.race([
            document.fonts.ready,
            new Promise(r => setTimeout(r, 3000))
        ]);
    }

    const fontSize = innerWidth >= 1180 ? 172 : innerWidth >= 820 ? 152 : 126;
    const { slices, cw, ch } = sampleTextToSlices('AiSL', 'Sora', fontSize, 5);
    if (slices.length === 0) return;

    // World mapping
    const worldW = innerWidth >= 1180 ? 7.6 : innerWidth >= 820 ? 8.1 : 7.4;
    const worldH = worldW * (ch / cw);
    const sliceH = (5 / ch) * worldH;
    const sliceThick = sliceH * 0.6;   // 60% fill → visible gaps
    const sliceDepth = 0.035;

    sliceGroup = new THREE.Group();

    const baseColor = new THREE.Color(0xc4ccd8);
    const activeColor = new THREE.Color(0xf1eee7);
    const accentColor = new THREE.Color(0x8fb7ff);

    slices.forEach((s) => {
        const wx = (s.x / cw) * worldW - worldW / 2;
        const wy = -(s.row / ch) * worldH + worldH / 2;
        const ww = (s.w / cw) * worldW;

        const isActive = Math.random() < 0.05;
        const isAccent = !isActive && Math.random() < 0.03;
        const baseOpacity = 0.15 + Math.random() * 0.12;

        const color = isActive ? activeColor : (isAccent ? accentColor : baseColor);
        const opacity = isActive ? 0.4 : (isAccent ? 0.28 : baseOpacity);

        const geo = new THREE.BoxGeometry(ww, sliceThick, sliceDepth);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0,  // Start invisible for assembly
            roughness: 0.94,
            metalness: 0.0,
            emissive: isActive ? 0x111821 : 0x000000,
            emissiveIntensity: isActive ? 0.18 : 0,
        });

        const mesh = new THREE.Mesh(geo, mat);

        // Target (assembled) position
        const targetX = wx + ww / 2;
        const targetY = wy;
        const targetZ = (Math.random() - 0.5) * 0.08;

        // Start position: vertically exploded (expanded apart from center)
        const expandFactor = 2.8;
        mesh.position.set(
            targetX + (Math.random() - 0.5) * 0.4,
            targetY * expandFactor,
            targetZ + (Math.random() - 0.5) * 1.5
        );

        mesh.userData = {
            targetX, targetY, targetZ,
            finalOpacity: opacity,
            phase: Math.random() * Math.PI * 2,
            driftSpeed: 0.12 + Math.random() * 0.16,
            driftX: 0.004 + Math.random() * 0.012,
            driftZ: 0.002 + Math.random() * 0.006,
            isActive,
            activePhase: Math.random() * Math.PI * 2,
            rowNorm: s.row / ch
        };

        sliceGroup.add(mesh);
        sliceMeshes.push(mesh);
    });

    sceneGroup.add(sliceGroup);
    positionAdaptiveMatter();

    if (introBooted) {
        assembleSlices();
    }
}

// ── SELF-ASSEMBLY INTRO ───────────────────────────────────────
function assembleSlices() {
    if (assembled || sliceMeshes.length === 0) return;
    assembled = true;

    sliceMeshes.forEach((mesh) => {
        const ud = mesh.userData;
        // Stagger: top rows arrive first, bottom last (waterfall)
        const delay = (1 - ud.rowNorm) * 0.8 + Math.random() * 0.15;

        gsap.to(mesh.position, {
            x: ud.targetX,
            y: ud.targetY,
            z: ud.targetZ,
            duration: 1.6 + Math.random() * 0.6,
            delay: delay,
            ease: 'power3.out'
        });

        gsap.to(mesh.material, {
            opacity: ud.finalOpacity,
            duration: 1.0,
            delay: delay + 0.15,
            ease: 'power2.out'
        });
    });
}

// ── INTERACTIVE STATE ─────────────────────────────────────────
const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();
const cursorEl = document.getElementById('cursor');
const cursorBlur = document.getElementById('cursor-blur');
const prefersCoarse = window.matchMedia('(pointer: coarse)').matches;
let cursorX = 0, cursorY = 0;

if (prefersCoarse) {
    document.body.classList.add('coarse-pointer');
    if (cursorEl) cursorEl.style.display = 'none';
    if (cursorBlur) cursorBlur.style.display = 'none';
} else {
    window.addEventListener('mousemove', (e) => {
        targetMouse.x = (e.clientX / innerWidth) * 2 - 1;
        targetMouse.y = -(e.clientY / innerHeight) * 2 + 1;
        cursorX = e.clientX;
        cursorY = e.clientY;
    });

    document.querySelectorAll('a, button, input, select, textarea').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (cursorEl) {
                gsap.to(cursorEl, {
                    scale: 3.5,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(143, 169, 255, 0.15)',
                    duration: 0.3
                });
            }
        });
        el.addEventListener('mouseleave', () => {
            if (cursorEl) {
                gsap.to(cursorEl, {
                    scale: 1,
                    borderColor: 'rgba(191, 199, 216, 0.5)',
                    backgroundColor: 'transparent',
                    duration: 0.3
                });
            }
        });
    });
}

// ── RENDER LOOP ───────────────────────────────────────────────
const clock = new THREE.Clock();

// Project mouse to world-space XY on z=0 plane for proximity checks
function mouseToWorld(mx, my) {
    const fovRad = camera.fov * Math.PI / 180;
    const halfH = Math.tan(fovRad / 2) * camera.position.z;
    const halfW = halfH * camera.aspect;
    return { x: mx * halfW, y: my * halfH };
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse lerp
    mouse.x += (targetMouse.x - mouse.x) * 0.04;
    mouse.y += (targetMouse.y - mouse.y) * 0.04;

    // Background atmosphere
    bgMat.uniforms.uTime.value = t;
    bgMat.uniforms.uMouse.value = mouse;

    // Very subtle scene tilt from mouse
    sceneGroup.rotation.y = mouse.x * 0.06;
    sceneGroup.rotation.x = -mouse.y * 0.04;

    // Animate slices (only after assembly started)
    if (assembled && sliceMeshes.length > 0) {
        const mWorld = mouseToWorld(mouse.x, mouse.y);

        for (let i = 0; i < sliceMeshes.length; i++) {
            const mesh = sliceMeshes[i];
            const ud = mesh.userData;

            // Gentle breathing drift
            const driftOffsetX = Math.sin(t * ud.driftSpeed + ud.phase) * ud.driftX;
            const driftOffsetZ = Math.cos(t * ud.driftSpeed * 0.7 + ud.phase) * ud.driftZ;

            // Mouse proximity → push slices apart slightly
            const dx = ud.targetX - mWorld.x;
            const dy = ud.targetY - mWorld.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const proximity = Math.max(0, 1 - dist / 2.5);
            const pushX = dx * proximity * 0.08;
            const pushZ = proximity * 0.15;

            mesh.position.x = ud.targetX + driftOffsetX + pushX;
            mesh.position.z = ud.targetZ + driftOffsetZ + pushZ;

            // Active slices: soft glow pulse
            if (ud.isActive) {
                const pulse = 0.55 + Math.sin(t * 1.2 + ud.activePhase) * 0.23;
                mesh.material.opacity = pulse;
                mesh.material.emissiveIntensity = 0.3 + Math.sin(t * 0.8 + ud.activePhase) * 0.2;
            }
        }
    }

    // Subtle sweep on rim light
    rimLight.position.x = Math.sin(t * 0.12) * 3;
    rimLight.position.y = Math.cos(t * 0.09) * 2;

    // Custom cursor
    if (cursorEl && !prefersCoarse) {
        cursorEl.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
        if (cursorBlur) {
            cursorBlur.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
        }
    }

    renderer.render(scene, camera);
}

animate();

// ── RESIZE ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    positionAdaptiveMatter();
});

// ── LOADER & INTRO ────────────────────────────────────────────
const loader = document.getElementById('ld-overlay');
const bar = document.getElementById('ld-bar');
const barGlow = document.getElementById('ld-bar-glow');
const shouldSkipLoader = new URLSearchParams(window.location.search).get('skipLoader') === '1';
let introBooted = false;

function initHeroStage() {
    if (!heroStage) return;

    if (heroVideo) {
        const revealVideo = () => heroVideo.classList.add('is-ready');

        if (heroVideo.readyState >= 2) {
            revealVideo();
        } else {
            heroVideo.addEventListener('loadeddata', revealVideo, { once: true });
        }

        heroStage.addEventListener('mouseenter', () => heroVideo.pause());
        heroStage.addEventListener('mouseleave', () => {
            heroVideo.play().catch(() => {});
        });
    }

    if (prefersCoarse) return;

    heroStage.addEventListener('mousemove', (event) => {
        const rect = heroStage.getBoundingClientRect();
        const relX = (event.clientX - rect.left) / rect.width - 0.5;
        const relY = (event.clientY - rect.top) / rect.height - 0.5;

        gsap.to(heroStage, {
            rotateY: relX * 3.5,
            rotateX: relY * -3,
            x: relX * 6,
            y: relY * 4,
            duration: 0.45,
            ease: 'power3.out'
        });
    });

    heroStage.addEventListener('mouseleave', () => {
        gsap.to(heroStage, {
            rotateY: 0,
            rotateX: 0,
            x: 0,
            y: 0,
            duration: 0.7,
            ease: 'power3.out'
        });
    });
}

function bootIntro() {
    if (introBooted) return;
    introBooted = true;

    if (loader) {
        loader.style.display = 'none';
    }

    document.body.classList.remove('is-loading');
    assembleSlices();
    initScrollingParallax();
    initHeroStage();
}

function runLoaderSequence() {
    if (shouldSkipLoader || !loader) {
        bootIntro();
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            bootIntro();
        }
    });

    tl.to('#ld-lockup', { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out' })
      .to(bar, { scaleX: 1, duration: 1.8, ease: 'power2.inOut' }, '-=0.3')
      .to(barGlow, { opacity: 0.8, duration: 0.4 }, '-=0.8')
      .to(loader, {
          yPercent: -100,
          opacity: 0,
          duration: 0.95,
          ease: 'power3.inOut'
      }, '+=0.2')
      .fromTo('.site-header', { y: -88, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.4')
      .fromTo('.hero-eyebrow', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
      .fromTo('.hero-kicker', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.45')
      .fromTo('.hero-subtext', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.45')
      .fromTo('.hero-lead', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
      .fromTo('.hero-actions', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
      .fromTo('.hero-proof-list', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.75 }, '-=0.55')
      .fromTo('.scroll-indicator', { opacity: 0, y: 10 }, { opacity: 0.35, y: 0, duration: 0.8 }, '-=0.3');
}

// Build slices before page load completes, so they're ready when loader finishes
buildAdaptiveMatter();

window.addEventListener('load', () => { runLoaderSequence(); });
if (document.readyState === 'complete') { runLoaderSequence(); }
setTimeout(() => {
    if (document.body.classList.contains('is-loading')) {
        bootIntro();
    }
}, shouldSkipLoader ? 0 : 3200);

// ── SCROLL PARALLAX ───────────────────────────────────────────
function initScrollingParallax() {
    if (prefersCoarse) return;

    // Slices compress and recede on scroll
    gsap.to(sceneGroup.position, {
        scrollTrigger: {
            trigger: '.unicorn-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        },
        z: -6,
        y: -1.5
    });

    // Fade slices on scroll
    if (sliceGroup) {
        gsap.to(sliceGroup.scale, {
            scrollTrigger: {
                trigger: '.unicorn-hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            },
            y: 0.6  // Vertical compression — slices squeeze together
        });
    }

    // Text elements parallax
    gsap.to('.unicorn-copy', {
        scrollTrigger: {
            trigger: '.unicorn-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        },
        y: 110,
        opacity: 0.22
    });

    // Scroll indicator
    gsap.to('.scroll-indicator', {
        scrollTrigger: {
            trigger: '.unicorn-hero',
            start: 'top top',
            end: '30% top',
            scrub: true
        },
        opacity: 0,
        y: 20
    });

    // Section reveals
    document.querySelectorAll('section').forEach(section => {
        if (section.id === 'home') return;
        gsap.fromTo(
            section.querySelectorAll('.section-tag, h2, p, .stats-row, .service-item, .work-card, .contact-form-shell, .form-intro'),
            { opacity: 0, y: 40 },
            {
                opacity: 1, y: 0,
                duration: 0.9, stagger: 0.15,
                ease: 'power3.out',
                scrollTrigger: { trigger: section, start: 'top 75%' }
            }
        );
    });
}

// ── SMOOTH SCROLL ROUTING ─────────────────────────────────────
document.querySelectorAll('[data-scroll]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-scroll') || link.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
            const headerOffset = document.getElementById('nav')?.offsetHeight || 0;
            window.scrollTo({ top: Math.max(0, target.offsetTop - headerOffset), behavior: 'smooth' });
        }
    });
});

// ── FORM HANDLER ──────────────────────────────────────────────
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');

if (form && status) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameVal = document.getElementById('name').value.trim();
        const emailVal = document.getElementById('email').value.trim();
        const roleVal = document.getElementById('role').value;
        const serviceVal = document.getElementById('service').value;
        const messageVal = document.getElementById('message').value.trim();

        if (!nameVal || !emailVal || !messageVal) {
            status.textContent = 'Please complete all required fields.';
            status.style.color = '#ef4444';
            return;
        }

        status.textContent = 'Submitting brief to the lab...';
        status.style.color = '#8fa9ff';

        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            const payload = {
                name: nameVal, email: emailVal,
                role: roleVal, service: serviceVal,
                message: messageVal,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('aisl:last-enquiry', JSON.stringify(payload));

            status.textContent = 'Intake complete. Our engineering team will review within one working day.';
            status.style.color = '#34d399';
            form.reset();
        } catch (err) {
            status.textContent = 'Connection interrupted. Please resubmit.';
            status.style.color = '#ef4444';
        }
    });
}
