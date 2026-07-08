/**
 * Interactive Happy Birthday Cake
 * Core Application Logic
 */

// Application State
const state = {
  name: "Friend",
  age: 1,
  flavor: "strawberry",
  sprinkles: true,
  musicPlaying: false,
  blowMode: "tap", // "tap" or "mic"
  isMuted: true,
  candles: [], // Array of { id, lit, element }
  micStream: null,
  audioCtx: null,
  analyser: null,
  micAnimationId: null,
  particles: [],
  fireworks: [],
  partyActive: false
};

// Web Audio API Synthesizer Configuration
// Happy Birthday Melody notes and durations (relative beats)
// Note structure: [frequency, duration_in_beats]
// Tempo: 120 BPM (0.5s per beat)
const tempo = 135;
const beatDuration = 60 / tempo;

const notes = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
  'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
  'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50
};

const birthdaySong = [
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
  ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2]
];

let synthInterval = null;
let currentNoteIndex = 0;

// DOM Elements
const welcomeModal = document.getElementById('welcomeModal');
const cakeConfigForm = document.getElementById('cakeConfigForm');
const appContainer = document.getElementById('appContainer');
const headerName = document.getElementById('headerName');
const headerSubtitle = document.getElementById('headerSubtitle');
const candleStand = document.getElementById('candleStand');
const balloonsContainer = document.getElementById('balloonsContainer');
const toppingsLayer = document.getElementById('toppingsLayer');

// Controls
const btnModeTap = document.getElementById('btnModeTap');
const btnModeMic = document.getElementById('btnModeMic');
const flavorSelect = document.getElementById('flavorSelect');
const btnSprinkles = document.getElementById('btnSprinkles');
const btnMusic = document.getElementById('btnMusic');
const btnShare = document.getElementById('btnShare');
const btnReset = document.getElementById('btnReset');
const micMeterContainer = document.getElementById('micMeterContainer');
const micBarFill = document.getElementById('micBarFill');
const micStatus = document.getElementById('micStatus');

// Greeting Card Modal
const cardModal = document.getElementById('cardModal');
const cardName = document.getElementById('cardName');
const cardAge = document.getElementById('cardAge');
const btnCloseCard = document.getElementById('btnCloseCard');

// Toast
const toastNotification = document.getElementById('toastNotification');

// Canvas
const canvas = document.getElementById('celebrationCanvas');
const ctx = canvas.getContext('2d');

/* ==========================================================================
   INITIALIZATION & PARAMETER PARSING
   ========================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  setupCanvasSize();
  window.addEventListener('resize', setupCanvasSize);
  
  // Create beautiful background particles
  generateBgParticles();
  
  // Check URL query parameters for pre-configuration (ideal for sharing)
  const params = new URLSearchParams(window.location.search);
  const paramName = params.get('name');
  const paramAge = parseInt(params.get('age'));
  const paramFlavor = params.get('flavor');
  
  if (paramName) {
    // Parameter present -> Skip setup form and load directly
    state.name = decodeURIComponent(paramName);
    state.age = Math.min(Math.max(paramAge || 1, 1), 99);
    state.flavor = ['strawberry', 'chocolate', 'vanilla', 'matcha'].includes(paramFlavor) ? paramFlavor : 'strawberry';
    
    welcomeModal.style.display = 'none';
    initializeParty();
  } else {
    // No parameters -> Show welcome modal and attach event listeners
    cakeConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.name = document.getElementById('inputName').value.trim() || "Friend";
      state.age = Math.min(Math.max(parseInt(document.getElementById('inputAge').value) || 1, 1), 99);
      state.flavor = document.getElementById('inputFlavor').value;
      
      // Animate modal out
      welcomeModal.style.opacity = '0';
      setTimeout(() => {
        welcomeModal.style.display = 'none';
        initializeParty();
      }, 500);
    });
  }

  setupEventListeners();
  animateCelebration();
});

function setupCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Set up UI components based on configuration state
function initializeParty() {
  // Update theme classes
  document.body.className = `theme-${state.flavor}`;
  flavorSelect.value = state.flavor;
  
  // Setup header texts
  headerName.textContent = state.name;
  cardName.textContent = state.name;
  cardAge.textContent = state.age;
  
  // Show Main App
  appContainer.style.display = 'flex';
  
  // Generate visual decorations
  buildCakeDecorations();
}

function buildCakeDecorations() {
  // Clear stand and toppings
  candleStand.innerHTML = '';
  toppingsLayer.innerHTML = '';
  
  // Generates Sprinkles
  generateSprinkles();
  
  // Generates Candles
  generateCandles();
}

/* ==========================================================================
   CAKE STYLING DECORATORS (CANDLES, SPRINKLES, BALLOONS)
   ========================================================================== */

function generateSprinkles() {
  const tiers = [
    { el: document.getElementById('tierBottom'), count: 60 },
    { el: document.getElementById('tierMiddle'), count: 40 },
    { el: document.getElementById('tierTop'), count: 25 }
  ];
  
  const sprinkleColors = ['#ffd23f', '#ff6b8b', '#4cc9f0', '#7209b7', '#f72585', '#ffffff'];
  
  tiers.forEach(tier => {
    // Remove existing sprinkles first
    const existing = tier.el.querySelector('.sprinkles-container');
    if (existing) existing.remove();
    
    if (!state.sprinkles) return;
    
    const container = document.createElement('div');
    container.className = 'sprinkles-container';
    
    const width = tier.el.offsetWidth;
    const height = tier.el.offsetHeight;
    
    for (let i = 0; i < tier.count; i++) {
      const sprinkle = document.createElement('div');
      sprinkle.className = 'sprinkle';
      
      // Position sprinkles within the visible body of the cylinder
      // Random x in the middle 90%
      const x = (0.05 + Math.random() * 0.9) * width;
      // Random y in the bottom 70% of the tier body
      const y = (0.2 + Math.random() * 0.75) * height;
      
      const color = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
      const rotation = Math.random() * 360;
      
      sprinkle.style.left = `${x}px`;
      sprinkle.style.top = `${y}px`;
      sprinkle.style.backgroundColor = color;
      sprinkle.style.setProperty('--r', `${rotation}deg`);
      
      container.appendChild(sprinkle);
    }
    tier.el.appendChild(container);
  });
}

function generateCandles() {
  state.candles = [];
  
  // Cap visual candles at 20 to avoid visual overcrowding, but allow user to enjoy any number
  const visualCandleCount = Math.min(state.age, 20);
  
  for (let i = 0; i < visualCandleCount; i++) {
    const candle = document.createElement('div');
    candle.className = 'candle';
    candle.dataset.id = i;
    
    // Add Flame
    const flame = document.createElement('div');
    flame.className = 'flame';
    candle.appendChild(flame);
    
    // Curved alignment matching the 3D-ellipse top of the top tier
    // Map i to range: x coordinate from 10% to 90%
    const percentX = visualCandleCount > 1 
      ? 10 + (i / (visualCandleCount - 1)) * 80 
      : 50;
      
    // Apply arc vertical offset based on sine wave to emulate visual perspective curvature
    const angleRad = visualCandleCount > 1 
      ? (i / (visualCandleCount - 1)) * Math.PI 
      : Math.PI / 2;
    const offset = Math.sin(angleRad) * 8; // curvature height
    
    candle.style.left = `${percentX}%`;
    candle.style.bottom = `${15 + offset}px`;
    
    // Tap to blow listener
    candle.addEventListener('click', () => {
      if (state.blowMode === 'tap') {
        extinguishCandle(i);
      }
    });
    
    candleStand.appendChild(candle);
    
    state.candles.push({
      id: i,
      lit: true,
      element: candle
    });
  }
}

function extinguishCandle(id) {
  const candleObj = state.candles.find(c => c.id === id);
  if (candleObj && candleObj.lit) {
    candleObj.lit = false;
    candleObj.element.classList.add('blown-out');
    
    // Play light synth chimes representing puff out sound
    playNoteSynth(600, 0.08, 'sine');
    playNoteSynth(300, 0.12, 'triangle');
    
    checkCelebrationState();
  }
}

function checkCelebrationState() {
  const allBlownOut = state.candles.every(c => !c.lit);
  if (allBlownOut && !state.partyActive) {
    triggerCelebration();
  }
}

function triggerCelebration() {
  state.partyActive = true;
  headerSubtitle.innerHTML = "✨ Make a Wish! Happy Birthday! ✨";
  
  // Burst balloons!
  spawnBalloons();
  
  // Burst confetti
  triggerConfettiExplosion();
  
  // Start Music automatically if not muted/playing
  if (!state.musicPlaying) {
    toggleMusic(true);
  }
  
  // Delay showing the greeting card for suspense
  setTimeout(() => {
    cardModal.style.display = 'flex';
    cardModal.style.opacity = '1';
  }, 1800);
}

function spawnBalloons() {
  const colors = ['#ff6b8b', '#ffd23f', '#3a86c8', '#8338ec', '#ff007f', '#00f5d4'];
  
  // Clear any old balloons
  balloonsContainer.innerHTML = '';
  
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      const balloon = document.createElement('div');
      balloon.className = 'balloon';
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      balloon.style.setProperty('--balloon-color', color);
      
      const left = Math.random() * 90;
      balloon.style.left = `${left}%`;
      
      // Floating animation values
      const duration = 5 + Math.random() * 4;
      const delay = Math.random() * 2;
      balloon.style.animation = `balloonSway 3s ease-in-out infinite alternate, floatUpAway ${duration}s ease-in ${delay}s forwards`;
      
      // Balloon string
      const string = document.createElement('div');
      string.className = 'balloon-string';
      balloon.appendChild(string);
      
      balloonsContainer.appendChild(balloon);
    }, i * 300);
  }
}

// Add animation keyframes for balloon flyaway inline to avoid CSS bloating
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes floatUpAway {
  0% { transform: translateY(105vh) scale(0.8); opacity: 0; }
  10% { opacity: 1; }
  95% { opacity: 1; }
  100% { transform: translateY(-110vh) scale(1.1); opacity: 0; }
}
`;
document.head.appendChild(styleSheet);

/* ==========================================================================
   WEB AUDIO API SOUND SYNTHESIZER
   ========================================================================== */

function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

// Simple synthesizer chime play
function playNoteSynth(frequency, duration, type = 'sine', volume = 0.15) {
  if (!state.audioCtx) return;
  
  const osc = state.audioCtx.createOscillator();
  const gainNode = state.audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, state.audioCtx.currentTime);
  
  // Custom ADSR envelope (Retro Arcade Chime Style)
  gainNode.gain.setValueAtTime(0, state.audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, state.audioCtx.currentTime + 0.02); // attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration); // decay/release
  
  osc.connect(gainNode);
  gainNode.connect(state.audioCtx.destination);
  
  osc.start();
  osc.stop(state.audioCtx.currentTime + duration);
}

function playSongStep() {
  if (!state.musicPlaying) return;
  
  const noteData = birthdaySong[currentNoteIndex];
  const noteName = noteData[0];
  const beats = noteData[1];
  
  const frequency = notes[noteName];
  const duration = beats * beatDuration;
  
  // Play main chime melody
  playNoteSynth(frequency, duration, 'triangle', 0.2);
  // Add harmonic chord chime layered below for premium tone depth
  const rootNote = noteName.substring(0, 1) + '3';
  if (notes[rootNote]) {
    playNoteSynth(notes[rootNote], duration * 1.5, 'sine', 0.08);
  }
  
  // Visual pulse sync on cake and title
  pulseStageVisuals();
  
  currentNoteIndex = (currentNoteIndex + 1) % birthdaySong.length;
  
  // Schedule next note
  synthInterval = setTimeout(playSongStep, duration * 1000);
}

function pulseStageVisuals() {
  const container = document.getElementById('cakeAssembly');
  container.style.transform = 'scale(1.03) rotate(0.5deg)';
  headerName.style.transform = 'scale(1.05)';
  
  setTimeout(() => {
    container.style.transform = 'scale(1) rotate(0deg)';
    headerName.style.transform = 'scale(1)';
  }, 150);
}

function toggleMusic(forcePlay = null) {
  initAudio();
  
  const shouldPlay = forcePlay !== null ? forcePlay : !state.musicPlaying;
  
  if (shouldPlay) {
    state.musicPlaying = true;
    btnMusic.textContent = "Pause ⏸️";
    btnMusic.classList.add('active');
    currentNoteIndex = 0;
    playSongStep();
  } else {
    state.musicPlaying = false;
    btnMusic.textContent = "Play 🎵";
    btnMusic.classList.remove('active');
    clearTimeout(synthInterval);
  }
}

/* ==========================================================================
   MICROPHONE INPUT BLOW DETECTOR
   ========================================================================== */

async function startMicDetection() {
  initAudio();
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micStream = stream;
    
    const source = state.audioCtx.createMediaStreamSource(stream);
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 512;
    source.connect(state.analyser);
    
    micStatus.textContent = "Listening... 🎤";
    micMeterContainer.style.display = 'block';
    
    detectBlowLoop();
  } catch (err) {
    console.warn("Microphone access denied or unavailable", err);
    alert("Microphone access is required to blow out candles with sound. Switch back to Tap mode or allow microphone permission.");
    setBlowMode('tap');
  }
}

function stopMicDetection() {
  if (state.micStream) {
    state.micStream.getTracks().forEach(track => track.stop());
    state.micStream = null;
  }
  if (state.micAnimationId) {
    cancelAnimationFrame(state.micAnimationId);
    state.micAnimationId = null;
  }
  micMeterContainer.style.display = 'none';
  micStatus.textContent = "Off";
}

let sustainedBlowFrames = 0;

function detectBlowLoop() {
  if (!state.analyser) return;
  
  const dataArray = new Uint8Array(state.analyser.frequencyBinCount);
  state.analyser.getByteFrequencyData(dataArray);
  
  // Calculate average volume in high frequency band (2kHz - 6kHz) which represents "hiss/blow" sound
  // fftSize=512 -> sampleRate=44100 -> each bin is ~86Hz. High frequency bins 25 to 70 represent ~2.1kHz to 6kHz.
  let highFreqSum = 0;
  const startBin = 25;
  const endBin = 75;
  
  for (let i = startBin; i < endBin; i++) {
    highFreqSum += dataArray[i];
  }
  
  const averageVolume = highFreqSum / (endBin - startBin);
  
  // Update meter visual (normalize value to 0-100%)
  const fillPercent = Math.min((averageVolume / 140) * 100, 100);
  micBarFill.style.width = `${fillPercent}%`;
  
  // Threshold to trigger candle blow: average high frequency volume > 50
  if (averageVolume > 50) {
    sustainedBlowFrames++;
    
    // Require sustained blow to filter out sudden loud pops/claps
    if (sustainedBlowFrames > 6) {
      // Find a lit candle and blow it out
      const litCandle = state.candles.find(c => c.lit);
      if (litCandle) {
        extinguishCandle(litCandle.id);
        // Reset frame check for candle sequence flow
        sustainedBlowFrames = 0;
      }
    }
  } else {
    // Decelerate blow frames slowly to avoid immediate cutoffs
    sustainedBlowFrames = Math.max(sustainedBlowFrames - 1, 0);
  }
  
  state.micAnimationId = requestAnimationFrame(detectBlowLoop);
}

function setBlowMode(mode) {
  state.blowMode = mode;
  if (mode === 'mic') {
    btnModeMic.classList.add('active');
    btnModeTap.classList.remove('active');
    startMicDetection();
  } else {
    btnModeTap.classList.add('active');
    btnModeMic.classList.remove('active');
    stopMicDetection();
  }
}

/* ==========================================================================
   CANVAS PARTICLE ENGINE (CONFETTI & FIREWORKS)
   ========================================================================== */

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 5 + Math.random() * 8;
    this.color = ['#ffd23f', '#ff6b8b', '#3a86c8', '#8338ec', '#ff007f', '#00f5d4'][Math.floor(Math.random() * 6)];
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = -5 - Math.random() * 8;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.gravity = 0.25;
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
  }
  
  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
  }
  
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

class FireworkSpark {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const speed = 1 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.alpha = 1;
    this.decay = 0.015 + Math.random() * 0.02;
    this.gravity = 0.08;
  }
  
  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }
  
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class FireworkRocket {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height;
    this.targetY = 100 + Math.random() * (canvas.height / 2 - 100);
    this.vy = -8 - Math.random() * 6;
    this.color = ['#ff6b8b', '#ffd23f', '#3a86c8', '#8338ec', '#00f5d4'][Math.floor(Math.random() * 5)];
    this.exploded = false;
  }
  
  update() {
    this.y += this.vy;
    if (this.y <= this.targetY) {
      this.explode();
    }
  }
  
  explode() {
    this.exploded = true;
    // Play mini synthesizer pop chord matching fireworks bloom
    playNoteSynth(150 + Math.random() * 100, 0.25, 'triangle', 0.08);
    playNoteSynth(400 + Math.random() * 200, 0.15, 'sine', 0.05);
    
    // Spawn sparkles
    const sparkCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < sparkCount; i++) {
      state.fireworks.push(new FireworkSpark(this.x, this.y, this.color));
    }
  }
  
  draw() {
    if (this.exploded) return;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function triggerConfettiExplosion() {
  const cakePos = document.getElementById('cakeAssembly').getBoundingClientRect();
  const startX = cakePos.left + cakePos.width / 2;
  const startY = cakePos.top;
  
  for (let i = 0; i < 150; i++) {
    state.particles.push(new ConfettiParticle(startX, startY));
  }
}

function animateCelebration() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Update & Draw Confetti Particles
  state.particles.forEach((p, idx) => {
    p.update();
    p.draw();
    
    // remove offscreen confetti
    if (p.y > canvas.height + 20) {
      state.particles.splice(idx, 1);
    }
  });
  
  // 2. Update & Draw Firework Sparkles
  state.fireworks.forEach((spark, idx) => {
    spark.update();
    spark.draw();
    
    if (spark.alpha <= 0) {
      state.fireworks.splice(idx, 1);
    }
  });
  
  // 3. Spawns and manages rockets occasionally if party is active
  if (state.partyActive && Math.random() < 0.02 && state.fireworks.filter(f => f.alpha === undefined).length < 2) {
    state.fireworks.push(new FireworkRocket());
  }
  
  // Rockets update & draw
  state.fireworks.forEach((item, idx) => {
    if (item.alpha === undefined) { // is a rocket
      item.update();
      item.draw();
      if (item.exploded) {
        state.fireworks.splice(idx, 1);
      }
    }
  });
  
  requestAnimationFrame(animateCelebration);
}

// Visual Background Particle Ambient System
function generateBgParticles() {
  const bgParticles = document.getElementById('bgParticles');
  bgParticles.innerHTML = '';
  
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'bg-particle';
    
    const size = 50 + Math.random() * 150;
    const left = Math.random() * 100;
    const duration = 20 + Math.random() * 20;
    const delay = -Math.random() * duration;
    
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${left}%`;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay = `${delay}s`;
    
    bgParticles.appendChild(p);
  }
}

/* ==========================================================================
   EVENT LISTENERS & CONTROLLER INTERFACE
   ========================================================================== */

function setupEventListeners() {
  // Blowing Mode Controls
  btnModeTap.addEventListener('click', () => setBlowMode('tap'));
  btnModeMic.addEventListener('click', () => setBlowMode('mic'));
  
  // Customization controls
  flavorSelect.addEventListener('change', (e) => {
    state.flavor = e.target.value;
    document.body.className = `theme-${state.flavor}`;
    buildCakeDecorations();
  });
  
  btnSprinkles.addEventListener('click', () => {
    state.sprinkles = !state.sprinkles;
    btnSprinkles.classList.toggle('active', state.sprinkles);
    btnSprinkles.textContent = state.sprinkles ? "On" : "Off";
    buildCakeDecorations();
  });
  
  btnMusic.addEventListener('click', () => {
    toggleMusic();
  });
  
  btnCloseCard.addEventListener('click', () => {
    // Hide Card modal
    cardModal.style.opacity = '0';
    setTimeout(() => {
      cardModal.style.display = 'none';
    }, 400);
  });
  
  btnReset.addEventListener('click', () => {
    // Stop mic and music
    setBlowMode('tap');
    toggleMusic(false);
    
    state.partyActive = false;
    state.candles = [];
    currentNoteIndex = 0;
    
    // Clear URL parameters
    window.history.pushState({}, document.title, window.location.pathname);
    
    // Reset Form and show modal
    document.getElementById('inputName').value = '';
    document.getElementById('inputAge').value = '1';
    
    appContainer.style.display = 'none';
    welcomeModal.style.display = 'flex';
    welcomeModal.style.opacity = '1';
    
    headerSubtitle.innerHTML = "Blow out the candles to make a wish!";
  });
  
  btnShare.addEventListener('click', () => {
    const encodedName = encodeURIComponent(state.name);
    const encodedAge = state.age;
    const encodedFlavor = state.flavor;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?name=${encodedName}&age=${encodedAge}&flavor=${encodedFlavor}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Show toast notification
      toastNotification.classList.add('show');
      setTimeout(() => {
        toastNotification.classList.remove('show');
      }, 3000);
    }).catch(err => {
      console.error('Could not copy link: ', err);
    });
  });
}
