let timer = null, confettiAnim = null, particles = [], audioCtx = null;
let currentMode = 'future';
const COLORS = ['#7F77DD','#1D9E75','#D85A30','#D4537E','#378ADD','#EF9F27','#E24B4A','#63C'];
const units = ['u-y','u-mo','u-d','u-h','u-mi','u-s'];

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTick() {
  if (!document.getElementById('soundToggle').checked) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 2800; filter.Q.value = 1.5;
  src.buffer = buf;
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.55, now);
  src.start(now);
}

function playFinish() {
  const ctx = getAudioCtx();
  [523, 659, 784, 1047].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = f;
    const t = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.4);
  });
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-future').classList.toggle('active', mode === 'future');
  document.getElementById('btn-past').classList.toggle('active', mode === 'past');
  units.forEach(id => document.getElementById(id).classList.toggle('past', mode === 'past'));
  document.getElementById('display').style.display = 'none';
  if (timer) { clearInterval(timer); timer = null; }
  stopConfetti();
}

function startCountdown() {
  const name = document.getElementById('eventName').value.trim();
  const dateVal = document.getElementById('targetDate').value;
  if (!dateVal) { alert('Please pick a date.'); return; }
  const target = new Date(dateVal);
  if (isNaN(target.getTime())) { alert('Invalid date.'); return; }
  const now = new Date();
  if (currentMode === 'future' && target <= now) { alert('Please pick a future date for countdown mode.'); return; }
  if (currentMode === 'past' && target >= now) { alert('Please pick a past date for past event mode.'); return; }

  const prefix = currentMode === 'past' ? 'Since: ' : 'Target: ';
  document.getElementById('displayName').textContent = name || (currentMode === 'past' ? 'Past event' : 'Countdown');
  document.getElementById('displayDate').textContent = prefix + target.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
  document.getElementById('display').style.display = 'block';
  document.getElementById('statusMsg').innerHTML = '';

  stopConfetti();
  if (timer) clearInterval(timer);
  tick(target);
  timer = setInterval(() => tick(target), 1000);
}

function tick(target) {
  const now = new Date();
  const diff = currentMode === 'past' ? now - target : target - now;
  const status = document.getElementById('statusMsg');

  if (currentMode === 'future' && diff <= 0) {
    clearInterval(timer);
    ['y','mo','d','h','mi','s'].forEach(id => document.getElementById(id).textContent = '0');
    status.innerHTML = '<div class="accent-msg">Time\'s up! Congratulations!</div>';
    playFinish();
    launchConfetti();
    return;
  }

  playTick();

  const absDiff = Math.abs(diff);
  const years = Math.floor(absDiff / (365.25 * 24 * 3600 * 1000));
  let rem = absDiff - years * 365.25 * 24 * 3600 * 1000;
  const months = Math.floor(rem / (30.44 * 24 * 3600 * 1000));
  rem -= months * 30.44 * 24 * 3600 * 1000;
  const days = Math.floor(rem / (24 * 3600 * 1000));
  rem -= days * 24 * 3600 * 1000;
  const hours = Math.floor(rem / (3600 * 1000));
  rem -= hours * 3600 * 1000;
  const mins = Math.floor(rem / 60000);
  rem -= mins * 60000;
  const secs = Math.floor(rem / 1000);

  document.getElementById('y').textContent = years;
  document.getElementById('mo').textContent = months;
  document.getElementById('d').textContent = days;
  document.getElementById('h').textContent = hours;
  document.getElementById('mi').textContent = mins;
  document.getElementById('s').textContent = secs;

  if (currentMode === 'past') {
    status.innerHTML = '<div class="success-msg">It\'s been this long since ' + document.getElementById('displayName').textContent + '.</div>';
  }
}

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.style.display = 'block';
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  particles = [];
  for (let i = 0; i < 180; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
      w: 8 + Math.random() * 8, h: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
      gravity: 0.08 + Math.random() * 0.06, opacity: 1
    });
  }
  let startTime = null;
  function draw(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.angle += p.spin;
      if (elapsed > 3000) p.opacity = Math.max(0, p.opacity - 0.008);
      if (p.y < canvas.height + 20 && p.opacity > 0) alive = true;
      ctx.save(); ctx.globalAlpha = p.opacity; ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
    }
    if (alive && elapsed < 7000) confettiAnim = requestAnimationFrame(draw);
    else stopConfetti();
  }
  confettiAnim = requestAnimationFrame(draw);
}

function stopConfetti() {
  if (confettiAnim) { cancelAnimationFrame(confettiAnim); confettiAnim = null; }
  const canvas = document.getElementById('confetti-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = 'none'; particles = [];
}

// Set default datetime to now
const now = new Date(); now.setSeconds(0, 0);
document.getElementById('targetDate').value = now.toISOString().slice(0, 16);
