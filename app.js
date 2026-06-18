(() => {
  const cfg = {
    key: 'cfly-rewards-we-in-here-2026-06-v3',
    max: 7,
    delay: 900,
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

  const $ = (id) => document.getElementById(id);
  const nodes = {};
  let state = { day: dayKey(), used: 0, done: false, busy: false, sound: true, speech: true, history: [] };
  let audioCtx;
  let currentVoice;
  let pressPlayTimer;

  document.addEventListener('DOMContentLoaded', start);

  function start() {
    ['triesLeftDisplay','downloadStatusDisplay','soundStatusDisplay','playButton','soundToggle','speechToggle','visibleResult','downloadPanel','downloadTitle','downloadMessage','downloadLink','shareLink','liveRegion','assertiveRegion','playHistory'].forEach(id => nodes[id] = $(id));
    nodes.tiles = [0,1,2].map(i => $(`tile${i}`));
    load();
    nodes.downloadTitle.textContent = 'CFLY! You matched three.';
    nodes.downloadMessage.textContent = 'Enter your email to claim your reward and stay connected with CFLY.';
    nodes.downloadLink.textContent = 'Claim Reward';
    nodes.downloadLink.href = cfg.claimForm;
    nodes.downloadLink.target = '_blank';
    nodes.downloadLink.rel = 'noopener';
    nodes.shareLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent('I just played CFLY Rewards by Cazerny Bussey.')}&url=${encodeURIComponent(location.href)}`;
    nodes.playButton.addEventListener('click', play);
    nodes.soundToggle.addEventListener('click', () => { state.sound = !state.sound; save(); draw(); say(state.sound ? 'Sound is on.' : 'Sound is off.'); if (state.sound && state.speech) startPressPlayLoop(1200); });
    nodes.speechToggle.addEventListener('click', () => { state.speech = !state.speech; stopVoice(); stopPressPlayLoop(); if (!state.speech && speechSynthesis) speechSynthesis.cancel(); save(); draw(); say(state.speech ? 'Game voice is on.' : 'Game voice is off. Screen reader text will still update.'); if (state.speech) startPressPlayLoop(1200); });
    draw();
    say('Welcome to CFLY Rewards. Let’s see what you unlock today.', true, false, 'welcome');
    startPressPlayLoop(3200);
  }

  async function play() {
    stopPressPlayLoop();
    if (state.busy) return;
    if (state.done) { openPanel(); say('Your reward is already unlocked. CFLY forever loves you.', true, false, 'cflyTag'); return; }
    if (left() <= 0) { result('Your plays are finished for today. Come back tomorrow.'); say('Your plays are finished for today. Come back tomorrow.', true, true); tone('low'); return; }

    state.busy = true;
    state.used += 1;
    save();
    draw();

    moving(true);
    result('The tiles are moving.');
    say('The tiles are moving. Let’s see what you get.', true, false, 'tilesMoving');
    tone('start');

    await wait(cfg.delay);
    const picked = build(left() === 0 && !state.done);
    for (let i = 0; i < 3; i++) {
      setTile(i, picked[i]);
      tone('tick');
      await wait(180);
    }
    moving(false);

    const ok = picked.every(x => x[0] === picked[0][0]) && picked[0][3];
    state.history.unshift({ labels: picked.map(x => x[1]), ok });
    state.history = state.history.slice(0, 6);

    if (ok) {
      state.done = true;
      result(`You matched three ${picked[0][1]} tiles. CFLY! Enter your email to claim your reward.`);
      tone('high');
      openPanel();
      say('CFLY! You matched three. Enter your email to claim your reward.', true, true, 'rewardUnlocked');
      setTimeout(() => { if (state.speech) playClip('cflyTag'); }, 1600);
    } else {
      result(`Not this time. Run it back. You have ${left()} ${left() === 1 ? 'play' : 'plays'} left today.`);
      tone('low');
      say('Not this time. Run it back.', true, false, 'notThisTime');
    }

    state.busy = false;
    save();
    draw();
    nodes.visibleResult.focus({ preventScroll: false });
    if (!state.done && left() > 0) startPressPlayLoop(2600);
  }

  function startPressPlayLoop(delay=0) {
    stopPressPlayLoop();
    if (state.done || state.busy || left() <= 0 || !state.speech) return;
    pressPlayTimer = setTimeout(() => {
      if (state.done || state.busy || left() <= 0 || !state.speech) return;
      say('Press play when you are ready.', true, false, 'pressPlay');
      startPressPlayLoop(cfg.remindEvery);
    }, delay);
  }
  function stopPressPlayLoop() { if (pressPlayTimer) { clearTimeout(pressPlayTimer); pressPlayTimer = null; } }
  function build(force) { if (force) { const one = pick(cfg.items.filter(x => x[3])); return [one, one, one]; } return [pick(cfg.items), pick(cfg.items), pick(cfg.items)]; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function setTile(i, item) { const n = nodes.tiles[i]; n.querySelector('.tile-emoji').textContent = item[2]; n.querySelector('.tile-label').textContent = item[1]; n.dataset.tile = item[0]; n.setAttribute('aria-label', `Tile ${i+1}: ${item[1]}`); }
  function moving(on) { nodes.tiles.forEach(n => { n.classList.toggle('moving', on); if (on) { const s = pick(cfg.items); n.querySelector('.tile-emoji').textContent = s[2]; n.querySelector('.tile-label').textContent = 'Moving'; } }); }
  function openPanel() { nodes.downloadPanel.hidden = false; nodes.downloadPanel.classList.add('download-visible'); }
  function result(text) { nodes.visibleResult.textContent = text; }
  function draw() { nodes.triesLeftDisplay.textContent = left(); nodes.downloadStatusDisplay.textContent = state.done ? 'Claim Ready' : 'Locked'; nodes.soundStatusDisplay.textContent = state.sound ? 'On' : 'Off'; nodes.playButton.disabled = state.busy || state.done || left() <= 0; nodes.playButton.textContent = state.done ? 'Reward Ready' : left() <= 0 ? 'No Plays Left' : 'Play'; nodes.soundToggle.textContent = state.sound ? 'Turn Sound Off' : 'Turn Sound On'; nodes.speechToggle.textContent = state.speech ? 'Turn Game Voice Off' : 'Turn Game Voice On'; history(); if (state.done) openPanel(); }
  function history() { nodes.playHistory.innerHTML = ''; if (!state.history.length) { const li = document.createElement('li'); li.textContent = 'No plays yet.'; nodes.playHistory.appendChild(li); return; } state.history.forEach(h => { const li = document.createElement('li'); li.textContent = `${h.ok ? 'Matched' : 'No match'}: ${h.labels.join(', ')}.`; nodes.playHistory.appendChild(li); }); }
  function say(text, voice=false, urgent=false, clip=null) {
    const region = urgent ? nodes.assertiveRegion : nodes.liveRegion;
    region.textContent='';
    setTimeout(()=>region.textContent=text,20);
    if (!voice || !state.speech) return;
    if (clip) { playClip(clip, text); return; }
    fallbackSpeech(text);
  }
  function playClip(name, fallbackText='') {
    const src = cfg.voice[name];
    if (!src) { fallbackSpeech(fallbackText); return; }
    try {
      stopVoice();
      currentVoice = new Audio(src);
      currentVoice.volume = 1;
      const playPromise = currentVoice.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => fallbackSpeech(fallbackText));
    } catch(e) { fallbackSpeech(fallbackText); }
  }
  function fallbackSpeech(text) { if (!text || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate=.94; speechSynthesis.speak(u); }
  function stopVoice() { try { if (currentVoice) { currentVoice.pause(); currentVoice.currentTime = 0; } } catch(e) {} }
  function tone(kind) { if (!state.sound) return; try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; audioCtx = audioCtx || new C(); if (audioCtx.state === 'suspended') audioCtx.resume(); const now = audioCtx.currentTime, g = audioCtx.createGain(), o = audioCtx.createOscillator(); const map = { start:[180,.16,.07], tick:[520,.08,.06], high:[880,.42,.09], low:[170,.18,.05] }; const [f,d,v] = map[kind] || map.tick; o.type = kind === 'high' ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f, now); g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(v, now+.02); g.gain.exponentialRampToValueAtTime(.0001, now+d); o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now+d+.02); } catch(e) {} }
  function load() { try { const raw = localStorage.getItem(cfg.key); const saved = raw && JSON.parse(raw); if (saved && saved.day === state.day) state = { ...state, ...saved }; } catch(e) {} }
  function save() { try { localStorage.setItem(cfg.key, JSON.stringify(state)); } catch(e) {} }
  function left() { return Math.max(0, cfg.max - state.used); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  function dayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
})();
