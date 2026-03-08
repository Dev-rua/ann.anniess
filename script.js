// ==========================================
// CẤU HÌNH DANH SÁCH ẢNH & TẠO TEXTURE
// ==========================================
const MAIN_IMAGE_SRC = 'image1.jpg'; 

const IMAGE_LIST = [
    'image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg',
    'image6.jpg', 'image7.jpg', 'image8.jpg', 'image9.jpg', 'image10.jpg',
    'image11.jpg', 'image12.jpg', 'image13.jpg'
];

let htmlImages = [];
let sphereTextures = [];
let glowingTextures = [];
let isLetterSequenceActive = false; 

function createGlowingCardTexture(img) {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 350;
    const ctx = canvas.getContext('2d');
    const x = 40, y = 40, w = 320, h = 270, r = 30; 

    ctx.shadowColor = 'rgba(255, 102, 163, 1)';
    ctx.shadowBlur = 30; ctx.fillStyle = 'white';
    
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();

    ctx.shadowBlur = 0; ctx.save(); ctx.clip(); 
    
    const imgRatio = img.width / img.height; const boxRatio = w / h;
    let drawW, drawH, drawX, drawY;
    if (imgRatio > boxRatio) {
        drawH = h; drawW = img.width * (h / img.height); drawX = x - (drawW - w) / 2; drawY = y;
    } else {
        drawW = w; drawH = img.height * (w / img.width); drawX = x; drawY = y - (drawH - h) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH); ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

IMAGE_LIST.forEach(src => {
    let img = new Image(); img.crossOrigin = "Anonymous"; img.src = src;
    img.onload = () => {
        htmlImages.push(img);
        let tex = new THREE.Texture(img);
        tex.needsUpdate = true; tex.colorSpace = THREE.SRGBColorSpace;
        sphereTextures.push(tex);
        glowingTextures.push(createGlowingCardTexture(img));
    }
});

// ==========================================
// PHẦN 1: CANVAS 2D (HẠT & CHỮ)
// ==========================================
const canvas = document.getElementById('textCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

let finalImage = null, finalImgX, finalImgY, finalImgW, finalImgH; 
let imageFadeProgress = 0, is2DActive = true; 
const PARTICLE_COUNT = 7000; let particles = [];

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
        this.targetX = this.x; this.targetY = this.y;
        this.vx = (Math.random() - 0.5) * 1.5; this.vy = (Math.random() - 0.5) * 1.5;
        this.baseSize = Math.random() * 1.5 + 0.8; 
        this.baseColor = Math.random() > 0.6 ? '#e84393' : '#fd79a8';
        this.size = this.baseSize; this.color = this.baseColor;
        this.targetImageColor = this.baseColor; this.state = 'WANDERING';
        this.ease = 0.04 + Math.random() * 0.06; 
    }
    update() {
        if (this.state !== 'FORMING_IMAGE') { this.color = this.baseColor; this.size = this.baseSize; }
        if (this.state === 'WANDERING') {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        } else if (this.state === 'FORMING') {
            this.x += (this.targetX - this.x) * this.ease; this.y += (this.targetY - this.y) * this.ease;
        } else if (this.state === 'FLOATING') {
            this.x += this.vx; this.y += this.vy; this.vx *= 0.95; this.vy *= 0.95;
        } else if (this.state === 'FORMING_IMAGE') {
            this.x += (this.targetX - this.x) * this.ease; this.y += (this.targetY - this.y) * this.ease;
            this.color = this.targetImageColor; this.size = 1.1; 
        }
    }
    draw() {
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

function animate2D() {
    if (!is2DActive) return; 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (imageFadeProgress > 0) ctx.globalAlpha = Math.max(0, 1 - imageFadeProgress * 1.5);
    for (let p of particles) { p.update(); p.draw(); }
    ctx.globalAlpha = 1;
    if (finalImage && imageFadeProgress > 0) {
        ctx.globalAlpha = imageFadeProgress; ctx.drawImage(finalImage, finalImgX, finalImgY, finalImgW, finalImgH); ctx.globalAlpha = 1; 
    }
    requestAnimationFrame(animate2D);
}
animate2D();

function getTextCoordinates(text) {
    const tempCanvas = document.createElement('canvas'); const tCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    
    // Tự động thu nhỏ cỡ chữ nếu là màn hình điện thoại
    let fontSize = window.innerWidth < 600 ? Math.max(40, window.innerWidth * 0.12) : 110;
    tCtx.font = `${fontSize}px 'Pacifico', cursive`; tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle'; tCtx.fillStyle = 'white';
    
    let lines = text.split('\n'); let lineHeight = fontSize * 1.3;
    let startY = tempCanvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => { tCtx.fillText(line, tempCanvas.width / 2, startY + index * lineHeight); });

    const data = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
    let coords = [];
    for (let y = 0; y < tempCanvas.height; y += 3) {
        for (let x = 0; x < tempCanvas.width; x += 3) {
            if (data[(y * tempCanvas.width + x) * 4 + 3] > 128) coords.push({ x: x + (Math.random() - 0.5), y: y + (Math.random() - 0.5) });
        }
    }
    return coords;
}

function getImageCoordinates(img) {
    const tempCanvas = document.createElement('canvas'); const tCtx = tempCanvas.getContext('2d');
    let maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.65;
    let scale = maxSize / Math.max(img.width, img.height);
    finalImgW = Math.floor(img.width * scale); finalImgH = Math.floor(img.height * scale);
    finalImgX = (canvas.width - finalImgW) / 2; finalImgY = (canvas.height - finalImgH) / 2;
    tempCanvas.width = finalImgW; tempCanvas.height = finalImgH;
    tCtx.drawImage(img, 0, 0, finalImgW, finalImgH);
    const data = tCtx.getImageData(0, 0, finalImgW, finalImgH).data;
    let coords = [];
    let step = Math.max(1, Math.floor(Math.sqrt((finalImgW * finalImgH) / PARTICLE_COUNT)));
    for (let y = 0; y < finalImgH; y += step) {
        for (let x = 0; x < finalImgW; x += step) {
            let idx = (y * finalImgW + x) * 4;
            if (data[idx+3] > 128) coords.push({ x: x + finalImgX, y: y + finalImgY, color: `rgb(${data[idx]},${data[idx+1]},${data[idx+2]})` });
        }
    }
    return coords;
}

// ==========================================
// PHẦN 2: LOGIC THREE.JS (VẬT LÝ & TƯƠNG TÁC)
// ==========================================
let scene, camera, renderer;
let sphereGroup, fallingGroup;
let sphereSegments = [];
let fallingCards = [];
let clickState = 0; 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let activeZoomCard = null; 

function initThreeJS() {
    const container = document.getElementById('three-container');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.z = window.innerWidth < 600 ? 1800 : 1200; // Đẩy camera ra xa hơn xíu nếu là điện thoại

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    sphereGroup = new THREE.Group(); fallingGroup = new THREE.Group(); 
    scene.add(sphereGroup); scene.add(fallingGroup);

    let textureMap = [];
    for(let i=0; i<98; i++) textureMap.push(i % sphereTextures.length);
    textureMap.sort(() => Math.random() - 0.5);

    const radius = window.innerWidth < 600 ? 350 : 450; 
    const rows = 7; const cols = 14; let index = 0;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let phiStart = j * (2 * Math.PI / cols); let phiLength = (2 * Math.PI / cols);
            let thetaStart = i * (Math.PI / rows); let thetaLength = (Math.PI / rows);
            let geo = new THREE.SphereGeometry(radius, 32, 32, phiStart, phiLength, thetaStart, thetaLength);
            
            let midPhi = phiStart + phiLength / 2; let midTheta = thetaStart + thetaLength / 2;
            let cx = radius * Math.sin(midTheta) * Math.cos(midPhi);
            let cy = radius * Math.cos(midTheta);
            let cz = radius * Math.sin(midTheta) * Math.sin(midPhi);
            geo.translate(-cx, -cy, -cz);

            let texIdx = textureMap[index]; index++;
            let mat = new THREE.MeshBasicMaterial({ 
                map: sphereTextures[texIdx], side: THREE.DoubleSide, transparent: true, opacity: 0 
            });

            let mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cx + (Math.random() - 0.5) * 3000, cy + (Math.random() - 0.5) * 3000, cz + (Math.random() - 0.5) * 3000);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            sphereGroup.add(mesh);
            sphereSegments.push({ mesh: mesh, texIdx: texIdx, cx: cx, cy: cy, cz: cz });

            gsap.to(mesh.position, { x: cx, y: cy, z: cz, duration: 2.5 + Math.random() * 1.5, ease: "power3.out" });
            gsap.to(mesh.rotation, { x: 0, y: 0, z: 0, duration: 2.5 + Math.random() * 1.5, ease: "power3.out" })
            gsap.to(mat, { opacity: 1, duration: 2 });
        }
    }

    function animate3D() {
        requestAnimationFrame(animate3D);
        if (clickState === 0 || clickState === 1) { sphereGroup.rotation.y += 0.002; } 
        
        if (clickState === 2) {
            fallingCards.forEach(card => {
                let ud = card.userData;
                if (ud.isZoomed || ud.isHovered) return;

                ud.vx *= 0.95; ud.vz *= 0.95;
                ud.vy += (-2.0 - ud.vy) * 0.05; 

                card.position.x += ud.vx; card.position.y += ud.vy; card.position.z += ud.vz;
                card.rotation.x += ud.rotX; card.rotation.y += ud.rotY; card.rotation.z += ud.rotZ;

                if (card.position.y < -1000) {
                    card.position.y = 1000 + Math.random() * 500;
                    card.position.x = camera.position.x + (Math.random() - 0.5) * 2500;
                    card.position.z = camera.position.z - 400 - Math.random() * 1500;
                    ud.vy = -(Math.random() * 2 + 1); ud.vx = (Math.random() - 0.5) * 1.5; ud.vz = (Math.random() - 0.5) * 1.5;
                    ud.rotX = (Math.random() - 0.5) * 0.02; ud.rotY = (Math.random() - 0.5) * 0.02; ud.rotZ = (Math.random() - 0.5) * 0.01;
                }
            });
        }
        renderer.render(scene, camera);
    }
    animate3D();

    window.addEventListener('mousemove', (e) => {
        if (clickState !== 2 || isLetterSequenceActive) return;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(fallingGroup.children);
        fallingCards.forEach(c => { if(!c.userData.isZoomed) c.userData.isHovered = false; });

        if (intersects.length > 0 && !activeZoomCard) {
            document.body.classList.add('hover-pointer');
            intersects[0].object.userData.isHovered = true; 
        } else { document.body.classList.remove('hover-pointer'); }
    });

    window.addEventListener('click', () => {
        if (isLetterSequenceActive) return; 

        if (clickState === 0) {
            clickState = 1; gsap.to(camera.position, { z: 200, duration: 2.5, ease: "power2.inOut" });
        } 
        else if (clickState === 1) {
            clickState = 2; sphereGroup.visible = false;

            sphereSegments.forEach(item => {
                let mat = new THREE.MeshBasicMaterial({ map: glowingTextures[item.texIdx], transparent: true, side: THREE.DoubleSide });
                let geo = new THREE.PlaneGeometry(130, 110); 
                let card = new THREE.Mesh(geo, mat);
                
                let worldPos = new THREE.Vector3(); 
                item.mesh.getWorldPosition(worldPos); 
                card.position.copy(worldPos);
                card.lookAt(new THREE.Vector3(0,0,0)); 

                let explodeDir = worldPos.clone().normalize(); let speed = 8 + Math.random() * 12;
                card.userData = {
                    vx: explodeDir.x * speed, vy: explodeDir.y * speed + (Math.random() * 6), vz: explodeDir.z * speed,
                    rotX: (Math.random() - 0.5) * 0.03, rotY: (Math.random() - 0.5) * 0.03, rotZ: (Math.random() - 0.5) * 0.01,
                    isHovered: false, isZoomed: false
                };
                fallingGroup.add(card); fallingCards.push(card);
            });

            setTimeout(() => {
                const mailBtn = document.getElementById('mail-btn');
                mailBtn.classList.remove('hidden-element');
                gsap.fromTo(mailBtn, {opacity: 0, scale: 0}, {opacity: 1, scale: 1, duration: 1, ease: "back.out(1.7)"});
            }, 2000);
        }
        else if (clickState === 2) {
            if (activeZoomCard) {
                gsap.to(activeZoomCard.position, { x: activeZoomCard.userData.savedX, y: activeZoomCard.userData.savedY, z: activeZoomCard.userData.savedZ, duration: 0.5, ease: "power2.inOut" });
                gsap.to(activeZoomCard.rotation, { x: activeZoomCard.userData.savedRotX, y: activeZoomCard.userData.savedRotY, z: activeZoomCard.userData.savedRotZ, duration: 0.5, ease: "power2.inOut", onComplete: () => { activeZoomCard.userData.isZoomed = false; activeZoomCard = null; } });
            } else {
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(fallingGroup.children);
                if (intersects.length > 0) {
                    activeZoomCard = intersects[0].object; let c = activeZoomCard; c.userData.isZoomed = true;
                    c.userData.savedX = c.position.x; c.userData.savedY = c.position.y; c.userData.savedZ = c.position.z;
                    c.userData.savedRotX = c.rotation.x; c.userData.savedRotY = c.rotation.y; c.userData.savedRotZ = c.rotation.z;
                    
                    let targetZ = window.innerWidth < 600 ? camera.position.z - 350 : camera.position.z - 150;
                    gsap.to(c.position, { x: camera.position.x, y: camera.position.y, z: targetZ, duration: 0.5, ease: "power2.out" });
                    gsap.to(c.rotation, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.out" });
                }
            }
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
    });
}


// ==========================================
// PHẦN 3: LOGIC MỞ THƯ & GÕ CHỮ (TYPEWRITER)
// ==========================================
document.getElementById('mail-btn').addEventListener('click', (e) => {
    e.stopPropagation(); 
    isLetterSequenceActive = true; 

    gsap.to(document.getElementById('three-container'), {opacity: 0.2, duration: 1.5});
    e.target.style.display = 'none';

    const letterWrapper = document.getElementById('letter-wrapper');
    letterWrapper.classList.remove('hidden-element');
    
    gsap.to(letterWrapper, {opacity: 1, duration: 1});
    gsap.fromTo('#center-envelope', {scale: 0}, {scale: 1, duration: 1, ease: "elastic.out(1, 0.3)", delay: 0.5});
});

document.getElementById('center-envelope').addEventListener('click', (e) => {
    e.stopPropagation();
    gsap.to(e.target, {scale: 0, opacity: 0, duration: 0.5});

    const banner = document.getElementById('letter-banner');
    gsap.to(banner, {scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 0.3});

    setTimeout(typeWriterText, 1200);
});

const wishesText = "Happy Women's Day! 💖\n\nChúc Em ngày 8/3 lúc nào cũng xinh đẹp,\nrạng rỡ, vui vẻ và luôn hạnh phúc nhé.\nMong những điều tốt đẹp nhất sẽ đến với em!🥰";
let typeIndex = 0;
function typeWriterText() {
    if (typeIndex < wishesText.length) {
        document.getElementById("typed-text").innerHTML += wishesText.charAt(typeIndex);
        typeIndex++;
        setTimeout(typeWriterText, 60); 
    }
}


// ==========================================
// PHẦN 4: ĐIỀU PHỐI SEQUENCE BẮT ĐẦU
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startSequence() {
    await document.fonts.ready;
    
    const texts = ["Chúc Em", "Ngày Quốc Tế\nPhụ Nữ 8/3", "Vui Vẻ"];

    for (let i = 0; i < texts.length; i++) {
        let targets = getTextCoordinates(texts[i]);
        targets.sort(() => Math.random() - 0.5); 
        let maxTextParticles = 4500; 
        if (targets.length > maxTextParticles) targets = targets.slice(0, maxTextParticles); 

        for (let j = 0; j < particles.length; j++) {
            let p = particles[j];
            if (j < targets.length) {
                p.targetX = targets[j].x; p.targetY = targets[j].y; p.state = 'FORMING';
            } else {
                p.state = 'WANDERING';
                if (Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
                    p.vx = (Math.random() - 0.5) * 2; p.vy = (Math.random() - 0.5) * 2;
                }
            }
        }
        await sleep(2500); 
        for (let p of particles) {
            if (p.state === 'FORMING') { p.state = 'FLOATING'; p.vx = (Math.random() - 0.5) * 10; p.vy = (Math.random() - 0.5) * 10 - 2; }
        }
        await sleep(1200); 
    }

    let img = new Image(); img.src = MAIN_IMAGE_SRC;
    img.onload = async () => {
        try {
            let imgTargets = getImageCoordinates(img); imgTargets.sort(() => Math.random() - 0.5);
            for (let j = 0; j < particles.length; j++) {
                let p = particles[j];
                if (j < imgTargets.length) {
                    p.targetX = imgTargets[j].x; p.targetY = imgTargets[j].y;
                    p.targetImageColor = imgTargets[j].color; p.state = 'FORMING_IMAGE';
                } else { p.state = 'WANDERING'; }
            }

            await sleep(1500); finalImage = img; 
            
            let fadeInterval = setInterval(() => {
                imageFadeProgress += 0.05; 
                if (imageFadeProgress >= 1) {
                    imageFadeProgress = 1; clearInterval(fadeInterval);
                    setTimeout(() => {
                        let fadeOutInterval = setInterval(() => {
                            imageFadeProgress -= 0.1;
                            if(imageFadeProgress <= 0) { imageFadeProgress = 0; clearInterval(fadeOutInterval); }
                        }, 30);
                        for(let p of particles) { p.state = 'FLOATING'; p.vx = (Math.random() - 0.5) * 45; p.vy = (Math.random() - 0.5) * 45; }
                        setTimeout(trigger3DTransition, 1000);
                    }, 2000); 
                }
            }, 100); 
        } catch (error) { alert("Chạy bằng Live Server nhé!"); }
    };
}

function trigger3DTransition() {
    canvas.style.opacity = 0; 
    const threeContainer = document.getElementById('three-container');
    threeContainer.style.opacity = 1; threeContainer.style.pointerEvents = 'auto'; 
    initThreeJS();
    setTimeout(() => { is2DActive = false; }, 1500);
}

// VÒNG TRÒN NHẤN GIỮ & KÍCH HOẠT NHẠC
const holdContainer = document.getElementById('hold-container');
const progressCircle = document.querySelector('.progress-ring__progress');
const radius = progressCircle.r.baseVal.value; const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;
let holdProgress = 0; let isPressing = false; let hasStarted = false;

function updateHoldProgress() {
    if (hasStarted) return;
    if (isPressing && holdProgress < 100) holdProgress += 1.5;
    else if (!isPressing && holdProgress > 0) holdProgress -= 3;
    if (holdProgress < 0) holdProgress = 0;
    progressCircle.style.strokeDashoffset = circumference - (holdProgress / 100) * circumference;
    
    if (holdProgress >= 100) {
        hasStarted = true; 
        holdContainer.style.opacity = 0;

        const bgMusic = document.getElementById('bg-music');
        if(bgMusic) {
            bgMusic.volume = 0.5;
            bgMusic.play().catch(e => console.log("Trình duyệt chặn nhạc:", e));
        }

        setTimeout(() => holdContainer.style.display = 'none', 500);
        startSequence(); 
    } else requestAnimationFrame(updateHoldProgress);
}

['mousedown', 'touchstart'].forEach(evt => holdContainer.addEventListener(evt, (e) => { 
    if(evt === 'touchstart') e.preventDefault(); isPressing = true; 
}));
['mouseup', 'mouseleave', 'touchend'].forEach(evt => window.addEventListener(evt, () => isPressing = false));
requestAnimationFrame(updateHoldProgress);