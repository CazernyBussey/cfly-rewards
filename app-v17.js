(() => {
  const cfg = {
    key: 'cfly-rewards-we-in-here-2026-06-v16-fresh',
    max: 7,
    tileVoiceFallbackMs: 3600,
    remindEvery: 6500,
    claimForm: 'https://form.jotform.com/261680287069062',
    voice: {
      welcome: './assets/voice/01-welcome.mp3',
      pressPlay: './assets/voice/02-press-play.mp3',
      tilesMoving: './assets/voice/03-tiles-moving.mp3',
      notThisTime: './assets/voice/07-not-this-time.mp3',
      lastPlay: './assets/voice/08-last-play.mp3',
      rewardUnlocked: './assets/voice/09-reward-unlocked.mp3',
      cflyTag: './assets/voice/10-cfly-tag.mp3'
    },
    items: [
      ['featured-reward', 'Featured reward', '🎁', true],
      ['music', 'Music', '🎧', true],
      ['cfly-crown', 'CFLY crown', '👑', true],
      ['microphone', 'Microphone', '🎤', false],
      ['spotlight', 'Spotlight', '✨', false],
      ['heart', 'CFLY heart', '🧡', false]
    ]
  };

  const $ = id => document.getElementById(id);
  const nodes = {};
  let state = freshState();
  let audioCtx = null;
  let currentVoice = null;
  let pressPlayTimer = null;
  const gameInstruction = 'Press Start to get started. Then press Play. Match three of the same tiles for a chance to win your reward.';
  const playInstruction = 'Press Play. Match three of the same tiles for a chance to win your reward.';

  document.addEventListener('DOMContentLoaded', start);

  function freshState() {
    return { day: dayKey(), used: 0, done: false, busy: false, started: false, sound: true, speech: true };
  }

  function start() {
    ['triesLeftDisplay','downloadStatusDisplay','soundStatusDisplay','playButton','soundToggle','speechToggle','visibleResult','downloadPanel','downloadTitle','downloadMessage','downloadLink','liveRegion','assertiveRegion','instructions'].forEach(id => nodes[id] = $(id));
    nodes.tiles = [0,1,2].map(i => $(`tile${i}`));
    load();
    state.busy = false;
    state.sound = true;
    state.speech = true;
    save();
    if (nodes.instructions) nodes.instructions.textContent = gameInstruction;
    nodes.downloadTitle.textContent = 'CFLY! You matched three.';
    nodes.downloadMessage.textContent = 'Enter your email to claim your reward and stay connected with CFLY.';
    nodes.downloadLink.textContent = 'Claim Reward';
    nodes.downloadLink.href = cfg.claimForm;
    nodes.downloadLink.target = '_blank';
    nodes.downloadLink.rel = 'noopener';
    nodes.playButton.onclick = handleMainButton;
    nodes.soundToggle.onclick = () => { state.sound = !state.sound; save(); draw(); say(state.sound ? 'Sound is on.' : 'Sound is off.'); };
    nodes.speechToggle.onclick = () => { state.speech = !state.speech; stopVoice(); stopPressPlayLoop(); if (!state.speech && 'speechSynthesis' in window) speechSynthesis.cancel(); save(); draw(); say(state.speech ? 'Game voice is on.' : 'Game voice is off. Screen reader text will still update.'); if (state.speech && state.started) startPressPlayLoop(1200); };
    draw();
  }

  function handleMainButton(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!state.started) return runIntro();
    return play(event);
  }

  async function runIntro() {
    if (state.busy) return;
    stopPressPlayLoop();
    state.sound = true;
    state.speech = true;
    state.busy = true;
    draw();
    result('Getting CFLY Rewards ready.');
    try {
      updateLive('Welcome to CFLY Rewards. Let’s see what you unlock today.', true);
      await playClipAndWait('welcome', 'Welcome to CFLY Rewards. Let’s see what you unlock today.', true, 3300);
      await wait(700);
      updateLive(playInstruction, true);
      await playClipAndWait('pressPlay', playInstruction, true, 2300);
      state.started = true;
      result('Ready. ' + playInstruction);
      if (nodes.instructions) nodes.instructions.textContent = playInstruction;
    } finally {
      state.busy = false;
      save();
      draw();
      startPressPlayLoop(2500);
    }
  }

  async function play(event) {
    if (event && event.preventDefault) event.preventDefault();
    stopPressPlayLoop();
    if (state.busy) return;
    if (state.done) { openPanel(); await playClipAndWait('cflyTag', 'CFLY means Cazerny Forever Loves You.', true, 3000); return; }
    if (left() <= 0) { result('Your plays are finished for today. Come back tomorrow.'); say('Your plays are finished for today. Come back tomorrow.', true, true); tone('low'); return; }
    state.busy = true;
    state.used = Math.min(cfg.max, state.used + 1);
    save();
    draw();
    try {
      moving(true);
      result('The tiles are moving.');
      updateLive('The tiles are moving. Let’s see what you get.');
      tone('start');
      await playClipAndWait('tilesMoving', 'The tiles are moving. Let’s see what you get.', true, cfg.tileVoiceFallbackMs);
      const picked = build(left() === 0 && !state.done);
      for (let i = 0; i < 3; i++) { setTile(i, picked[i]); tone('tick'); await wait(180); }
      moving(false);
      const ok = picked.every(x => x[0] === picked[0][0]) && picked[0][3];
      if (ok) {
        state.done = true;
        result(`You matched three ${picked[0][1]} tiles. CFLY! Enter your email to claim your reward.`);
        tone('high');
        openPanel();
        updateLive('CFLY! You matched three. Enter your email to claim your reward.', true);
        await playClipAndWait('rewardUnlocked', 'CFLY! You matched three. Enter your email to claim your reward.', true, 4300);
        await wait(1800);
        updateLive('CFLY means Cazerny Forever Loves You.', true);
        await playClipAndWait('cflyTag', 'CFLY means Cazerny Forever Loves You.', true, 3200);
      } else {
        result(`Not this time. Run it back. You have ${left()} ${left() === 1 ? 'play' : 'plays'} left today.`);
        tone('low');
        updateLive('Not this time. Run it back.');
        await playClipAndWait('notThisTime', 'Not this time. Run it back.', true, 1800);
        if (left() === 1) {
          await wait(800);
          result('You only have one more chance. This is your last play for today. Make it count.');
          updateLive('You only have one more chance. This is your last play for today. Make it count.', true);
          await playClipAndWait('lastPlay', 'You only have one more chance. This is your last play for today. Make it count.', true, 3400);
        }
      }
    } catch (e) {
      result('The game had a small issue. Press Play again.');
    } finally {
      moving(false);
      state.busy = false;
      save();
      draw();
      if (nodes.visibleResult && nodes.visibleResult.focus) nodes.visibleResult.focus({ preventScroll: false });
      if (!state.done && left() > 0 && state.started) startPressPlayLoop(900);
    }
  }

  function startPressPlayLoop(delay=0) {
    stopPressPlayLoop();
    if (!state.started || state.done || state.busy || left() <= 0 || !state.speech) return;
    pressPlayTimer = setTimeout(() => {
      if (!state.started || state.done || state.busy || left() <= 0 || !state.speech) return;
      updateLive(playInstruction);
      playClip('pressPlay', '', false);
      startPressPlayLoop(cfg.remindEvery);
    }, delay);
  }

  function stopPressPlayLoop() { if (pressPlayTimer) clearTimeout(pressPlayTimer); pressPlayTimer = null; }
  function playClipAndWait(name, fallbackText='', allowFallback=true, fallbackMs=2500) {
    if (!state.speech) return wait(fallbackMs);
    const src = cfg.voice[name];
    if (!src) { if (allowFallback) fallbackSpeech(fallbackText); return wait(fallbackMs); }
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      try {
        stopVoice();
        currentVoice = new Audio(src);
        currentVoice.volume = 1;
        currentVoice.addEventListener('ended', finish, { once: true });
        currentVoice.addEventListener('error', () => { if (allowFallback) fallbackSpeech(fallbackText); setTimeout(finish, fallbackMs); }, { once: true });
        const p = currentVoice.play();
        if (p && p.catch) p.catch(() => { if (allowFallback) fallbackSpeech(fallbackText); setTimeout(finish, fallbackMs); });
        setTimeout(finish, Math.max(fallbackMs, 6500));
      } catch (e) { if (allowFallback) fallbackSpeech(fallbackText); setTimeout(finish, fallbackMs); }
    });
  }
  function playClip(name, fallbackText='', allowFallback=true, onEnded=null) {
    const src = cfg.voice[name];
    if (!src) { if (allowFallback) fallbackSpeech(fallbackText); return; }
    try {
      stopVoice();
      currentVoice = new Audio(src);
      currentVoice.volume = 1;
      if (onEnded) currentVoice.addEventListener('ended', onEnded, { once: true });
      const p = currentVoice.play();
      if (p && p.catch) p.catch(() => { if (allowFallback) fallbackSpeech(fallbackText); });
    } catch (e) { if (allowFallback) fallbackSpeech(fallbackText); }
  }
  function build(force) { if (force) { const one = pick(cfg.items.filter(x => x[3])); return [one, one, one]; } return [pick(cfg.items), pick(cfg.items), pick(cfg.items)]; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function setTile(i, item) { const n = nodes.tiles[i]; n.querySelector('.tile-emoji').textContent = item[2]; n.querySelector('.tile-label').textContent = item[1]; n.dataset.tile = item[0]; n.setAttribute('aria-label', `Tile ${i+1}: ${item[1]}`); }
  function moving(on) { nodes.tiles.forEach(n => { n.classList.toggle('moving', on); if (on) { const s = pick(cfg.items); n.querySelector('.tile-emoji').textContent = s[2]; n.querySelector('.tile-label').textContent = 'Moving'; } }); }
  function openPanel() { nodes.downloadPanel.hidden = false; nodes.downloadPanel.classList.add('download-visible'); }
  function result(text) { nodes.visibleResult.textContent = text; }
  function draw() {
    nodes.triesLeftDisplay.textContent = left();
    nodes.downloadStatusDisplay.textContent = state.done ? 'Claim Ready' : 'Locked';
    nodes.soundStatusDisplay.textContent = 'On';
    nodes.playButton.disabled = state.busy || state.done || (state.started && left() <= 0);
    nodes.playButton.textContent = state.busy ? (state.started ? 'Playing' : 'Getting Ready') : state.done ? 'Reward Ready' : !state.started ? 'Start' : left() <= 0 ? 'No Plays Left' : 'Play';
    nodes.soundToggle.textContent = state.sound ? 'Turn Sound Off' : 'Turn Sound On';
    nodes.speechToggle.textContent = state.speech ? 'Turn Game Voice Off' : 'Turn Game Voice On';
    if (state.done) openPanel();
  }
  function updateLive(text, urgent=false) { const region = urgent ? nodes.assertiveRegion : nodes.liveRegion; if (!region) return; region.textContent = ''; setTimeout(() => region.textContent = text, 20); }
  function say(text, voice=false, urgent=false, clip=null) { updateLive(text, urgent); if (!voice || !state.speech) return; if (clip) { playClip(clip, text, true); return; } fallbackSpeech(text); }
  function fallbackSpeech(text) { if (!text || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = .94; speechSynthesis.speak(u); }
  function stopVoice() { try { if (currentVoice) { currentVoice.pause(); currentVoice.currentTime = 0; } } catch (e) {} }
  function tone(kind) {
    if (!state.sound) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      audioCtx = audioCtx || new C();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime, g = audioCtx.createGain(), o = audioCtx.createOscillator();
      const map = { start:[210,.22,.24], tick:[640,.1,.2], high:[980,.55,.28], low:[190,.24,.16] };
      const [f,d,v] = map[kind] || map.tick;
      o.type = kind === 'high' ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(.0001, now);
      g.gain.exponentialRampToValueAtTime(v, now + .02);
      g.gain.exponentialRampToValueAtTime(.0001, now + d);
      o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + d + .02);
    } catch (e) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(cfg.key);
      const saved = raw && JSON.parse(raw);
      if (saved && saved.day === state.day) {
        state.used = Number(saved.used) || 0;
        state.done = !!saved.done;
        state.started = !!saved.started;
      }
    } catch (e) {}
    state.busy = false;
    state.sound = true;
    state.speech = true;
  }
  function save() { try { localStorage.setItem(cfg.key, JSON.stringify({ day: state.day, used: state.used, done: state.done, started: state.started })); } catch (e) {} }
  function left() { return Math.max(0, cfg.max - state.used); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  function dayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
})();