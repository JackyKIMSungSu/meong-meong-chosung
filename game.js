// ===== Constants =====
const TOTAL_QUESTIONS = 10;
const SURVIVAL_LIVES = 3;
const SPEEDRUN_TIME = 60;

const DIFFICULTY = {
  easy:   { time: 30, hints: 3, basePoints: 10 },
  normal: { time: 20, hints: 2, basePoints: 15 },
  hard:   { time: 10, hints: 1, basePoints: 25 },
};

const GAME_MODES = {
  classic:  { name: '클래식',   emoji: '🎯' },
  survival: { name: '서바이벌', emoji: '💀' },
  speedrun: { name: '스피드런', emoji: '⚡' },
};

// 마스코트 진화 (점수에 따라)
const MASCOT_EVOLUTION = [
  { threshold: 0,    face: '🐶', name: '강아지' },
  { threshold: 100,  face: '🦊', name: '여우' },
  { threshold: 300,  face: '🐺', name: '늑대' },
  { threshold: 600,  face: '🦁', name: '사자' },
  { threshold: 1000, face: '🐉', name: '드래곤' },
];

// 아이템 정의
const ITEMS = {
  time: {
    emoji: '⏱️',
    name: '시간 +5초',
    desc: '남은 시간을 5초 추가합니다',
    use: (s) => {
      s.timeLeft = Math.min(s.timeLeft + 5, DIFFICULTY[s.difficulty].time + 10);
      showFloatingText('+5초!', '#4dabf7');
    },
  },
  reveal: {
    emoji: '👁️',
    name: '글자 공개',
    desc: '랜덤 글자 1개를 공개합니다',
    use: (s) => {
      const q = s.questions[s.currentIdx];
      // 아직 공개되지 않은 위치 찾기
      const unrevealed = [];
      for (let i = 0; i < q.word.length; i++) {
        if (!s.revealedPositions.has(i)) unrevealed.push(i);
      }
      if (unrevealed.length === 0) return false;
      const pos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      s.revealedPositions.add(pos);
      updateChosungDisplay();
      showFloatingText(`👁️ ${q.word[pos]}`, '#9775fa');
    },
  },
  double: {
    emoji: '💎',
    name: '더블 점수',
    desc: '다음 정답 점수를 2배로!',
    use: (s) => {
      s.doubleScoreActive = true;
      showFloatingText('💎 DOUBLE!', '#ff6b9d');
    },
  },
};

// 업적 정의
const BADGES = {
  first_correct: { emoji: '🎯', name: '첫 정답', desc: '첫 정답을 맞히세요' },
  combo_5:       { emoji: '🔥', name: '연속 5콤보', desc: '5콤보 달성' },
  combo_10:      { emoji: '🌋', name: '연속 10콤보', desc: '10콤보 달성' },
  perfect:       { emoji: '💯', name: '퍼펙트', desc: '클래식 모드 100% 정답' },
  no_hint:       { emoji: '🧠', name: '천재', desc: '힌트 없이 클래식 클리어' },
  speedster:     { emoji: '💨', name: '스피드스터', desc: '스피드런 15문제 이상' },
  survivor:      { emoji: '💪', name: '생존자', desc: '서바이벌 20문제 이상' },
  golden:        { emoji: '✨', name: '황금손', desc: '골든 문제 정답' },
  collector:     { emoji: '🎁', name: '수집가', desc: '아이템 5개 사용' },
  evolved:       { emoji: '🐉', name: '드래곤', desc: '최종 진화(드래곤) 도달' },
  score_500:     { emoji: '⭐', name: '500점', desc: '한 게임에 500점' },
  score_1000:    { emoji: '🌟', name: '1000점', desc: '한 게임에 1000점' },
};

// 마스코트 멘트
const MASCOT_LINES = {
  ready:   ['맞혀봐 멍! 🐾', '뭘까 멍?', '잘 봐 멍!', '시작이다 멍!'],
  correct: ['멍멍! 정답!', '대단해 멍! 🐾', '천재 멍?!', '오~~ 멍!', '깜짝이야 멍!'],
  wrong:   ['아쉽다 멍...', '다시! 다시!', '엇 아니야 멍', '음... 다시 멍'],
  combo:   ['콤보다 멍! 🔥', '불타오르네 멍!', '대단해 대단해!', '멈출 수 없어 멍!'],
  skip:    ['괜찮아 멍 🐾', '다음 문제 가자!'],
  timeout: ['시간초과 멍...', '아쉬워 멍 ㅠ'],
  golden:  ['황금이다 멍! ✨', '두 배 점수 멍!', '대박 멍!'],
  evolve:  ['진화했다 멍?!', '난 이제 다른 존재 멍!'],
};

// ===== Game State =====
const state = {
  selectedCategory: 'food',
  difficulty: 'easy',
  mode: 'classic',
  questions: [],
  currentIdx: 0,
  score: 0,
  hintsRemaining: 3,
  hintsUsedTotal: 0,
  hintLevel: 0,
  timer: null,
  globalTimer: null, // 스피드런용
  globalTimeLeft: 60,
  timeLeft: 30,
  results: [],
  combo: 0,
  maxCombo: 0,
  soundOn: true,
  lives: 3,
  isGolden: false,
  doubleScoreActive: false,
  revealedPositions: new Set(),
  inventory: { time: 0, reveal: 0, double: 0 },
  itemsUsedTotal: 0,
  currentMascotStage: 0,
  earnedBadges: [],
  newBadgesThisGame: [],
};

// ===== Save / Load =====
const STORAGE_KEY = 'chosung_game_v2';

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      bestScores: data.bestScores || {},
      badges: data.badges || [],
      itemsUsedAllTime: data.itemsUsedAllTime || 0,
      lastVisit: data.lastVisit || null,
      streak: data.streak || 0,
      bestStreak: data.bestStreak || 0,
      streakRewardsClaimed: data.streakRewardsClaimed || [],
      dailyResults: data.dailyResults || {},
      collection: data.collection || [],
    };
  } catch (e) {
    return {
      bestScores: {}, badges: [], itemsUsedAllTime: 0,
      lastVisit: null, streak: 0, bestStreak: 0,
      streakRewardsClaimed: [], dailyResults: {}, collection: [],
    };
  }
}

function saveProgress(updates) {
  const cur = loadProgress();
  const merged = { ...cur, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const screens = {
  start: $('#start-screen'),
  game: $('#game-screen'),
  result: $('#result-screen'),
  badges: $('#badges-screen'),
  collection: $('#collection-screen'),
};

// ===== Sound (Web Audio) =====
let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function beep(freq, duration = 0.1, type = 'sine', volume = 0.15) {
  if (!state.soundOn) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* ignore */ }
}

const SFX = {
  correct: () => {
    beep(523.25, 0.1, 'sine');
    setTimeout(() => beep(659.25, 0.1, 'sine'), 80);
    setTimeout(() => beep(783.99, 0.18, 'sine'), 160);
  },
  wrong: () => {
    beep(220, 0.15, 'sawtooth', 0.1);
    setTimeout(() => beep(196, 0.2, 'sawtooth', 0.1), 100);
  },
  tick: () => beep(880, 0.05, 'square', 0.08),
  click: () => beep(660, 0.05, 'sine', 0.08),
  combo: () => {
    beep(659.25, 0.08, 'sine');
    setTimeout(() => beep(783.99, 0.08, 'sine'), 60);
    setTimeout(() => beep(987.77, 0.08, 'sine'), 120);
    setTimeout(() => beep(1318.51, 0.18, 'sine'), 180);
  },
  timeup: () => {
    beep(330, 0.1, 'square', 0.12);
    setTimeout(() => beep(220, 0.25, 'square', 0.12), 100);
  },
  skip: () => beep(440, 0.1, 'triangle', 0.1),
  victory: () => {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => beep(f, 0.15, 'sine', 0.18), i * 100);
    });
  },
  item: () => {
    beep(880, 0.06, 'sine');
    setTimeout(() => beep(1318.51, 0.1, 'sine'), 50);
  },
  golden: () => {
    [659.25, 783.99, 987.77, 1318.51, 1567.98].forEach((f, i) => {
      setTimeout(() => beep(f, 0.12, 'sine', 0.16), i * 60);
    });
  },
  badge: () => {
    [659.25, 880, 1318.51].forEach((f, i) => {
      setTimeout(() => beep(f, 0.15, 'triangle', 0.18), i * 80);
    });
  },
  evolve: () => {
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => beep(f, 0.1, 'sine', 0.15), i * 60);
    });
  },
  life_lost: () => {
    beep(440, 0.15, 'sawtooth', 0.15);
    setTimeout(() => beep(220, 0.3, 'sawtooth', 0.15), 100);
  },
};

// ===== Date / Daily Helpers =====
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function mulberry32(seed) {
  return function() {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToSeed(dateKey) {
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) {
    seed = ((seed * 31) + dateKey.charCodeAt(i)) | 0;
  }
  return seed;
}

const DAILY_QUESTION_COUNT = 5;
const DAILY_TIME_PER_Q = 30;

function getDailyQuestions(dateKey) {
  const rand = mulberry32(dateToSeed(dateKey));
  const allWords = [];
  Object.entries(WORD_DATA).forEach(([catKey, data]) => {
    data.words.forEach(w => allWords.push({ ...w, category: catKey }));
  });
  const picked = [];
  const usedIdx = new Set();
  while (picked.length < DAILY_QUESTION_COUNT && usedIdx.size < allWords.length) {
    const idx = Math.floor(rand() * allWords.length);
    if (usedIdx.has(idx)) continue;
    usedIdx.add(idx);
    picked.push(allWords[idx]);
  }
  return picked;
}

// ===== Streak =====
const STREAK_REWARDS = [
  { day: 3,  emoji: '🎁', name: '3일 출석', items: { time: 1, reveal: 1 } },
  { day: 7,  emoji: '🎉', name: '7일 출석', items: { time: 2, reveal: 2, double: 1 } },
  { day: 14, emoji: '🏆', name: '14일 출석', items: { time: 3, reveal: 3, double: 2 } },
  { day: 30, emoji: '👑', name: '30일 출석 마스터', items: { time: 5, reveal: 5, double: 3 } },
];

function checkStreak() {
  const data = loadProgress();
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (data.lastVisit === today) {
    return data.streak;
  }

  let newStreak;
  if (data.lastVisit === yesterday) {
    newStreak = data.streak + 1;
  } else {
    newStreak = 1;
  }

  const bestStreak = Math.max(data.bestStreak, newStreak);
  const claimed = data.streakRewardsClaimed || [];
  const grantedItems = { time: 0, reveal: 0, double: 0 };
  const newRewardEmojis = [];

  STREAK_REWARDS.forEach(r => {
    if (newStreak >= r.day && !claimed.includes(r.day)) {
      claimed.push(r.day);
      Object.entries(r.items).forEach(([k, v]) => {
        grantedItems[k] = (grantedItems[k] || 0) + v;
      });
      newRewardEmojis.push({ emoji: r.emoji, name: r.name });
    }
  });

  // 스트릭 끊김 시 claimed 리셋 (다시 도전 가능)
  if (newStreak === 1) {
    saveProgress({
      lastVisit: today,
      streak: 1,
      bestStreak,
      streakRewardsClaimed: [],
      pendingItems: data.pendingItems || { time: 0, reveal: 0, double: 0 },
    });
  } else {
    // 보상 아이템은 다음 게임에 추가하기 위해 pendingItems에 누적
    const pending = data.pendingItems || { time: 0, reveal: 0, double: 0 };
    Object.keys(grantedItems).forEach(k => {
      pending[k] = (pending[k] || 0) + grantedItems[k];
    });
    saveProgress({
      lastVisit: today,
      streak: newStreak,
      bestStreak,
      streakRewardsClaimed: claimed,
      pendingItems: pending,
    });
  }

  // 마일스톤 보상 토스트 표시
  if (newRewardEmojis.length > 0) {
    let delay = 800;
    newRewardEmojis.forEach(r => {
      setTimeout(() => {
        const toast = $('#badge-toast');
        $('#badge-toast-name').textContent = r.name + ' 보상 획득!';
        toast.querySelector('.badge-toast-emoji').textContent = r.emoji;
        toast.classList.add('show');
        SFX.badge();
        setTimeout(() => toast.classList.remove('show'), 2800);
      }, delay);
      delay += 3200;
    });
  }

  return newStreak;
}

// ===== Word Collection (도감) =====
function addToCollection(word) {
  const data = loadProgress();
  const collection = data.collection || [];
  if (!collection.includes(word)) {
    collection.push(word);
    saveProgress({ collection });
    setTimeout(() => {
      showFloatingText(`📖 새 단어!`, '#20c997');
    }, 400);
  }
}

// ===== Pending Items (출석 보상) =====
function applyPendingItems() {
  const data = loadProgress();
  const pending = data.pendingItems || { time: 0, reveal: 0, double: 0 };
  let total = 0;
  Object.keys(pending).forEach(k => {
    if (pending[k] > 0) {
      state.inventory[k] = (state.inventory[k] || 0) + pending[k];
      total += pending[k];
    }
  });
  if (total > 0) {
    saveProgress({ pendingItems: { time: 0, reveal: 0, double: 0 } });
    setTimeout(() => {
      showFloatingText(`🎁 출석 보상 ${total}개!`, '#ffd93d');
    }, 600);
  }
}

// ===== Init =====
function init() {
  // 출석 체크 → 스트릭 업데이트
  checkStreak();

  renderCategories();
  renderBestRecords();
  renderBadgeCount();
  renderCollectionCount();
  renderStreakBanner();
  renderDailyCard();
  bindEvents();
}

function renderCategories() {
  const list = $('#category-list');
  list.innerHTML = '';
  Object.entries(WORD_DATA).forEach(([key, data]) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (key === state.selectedCategory ? ' active' : '');
    btn.dataset.category = key;
    btn.innerHTML = `<span class="cat-emoji">${data.emoji}</span><span>${data.name}</span>`;
    btn.addEventListener('click', () => {
      SFX.click();
      state.selectedCategory = key;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    list.appendChild(btn);
  });
}

function renderBestRecords() {
  const { bestScores } = loadProgress();
  ['classic', 'survival', 'speedrun'].forEach(mode => {
    const el = $(`#best-${mode}`);
    if (el) el.textContent = bestScores[mode] ? `🏆 ${bestScores[mode]}` : '-';
  });
}

function renderBadgeCount() {
  const { badges } = loadProgress();
  $('#badge-count').textContent = badges.length;
  $('#badge-total').textContent = Object.keys(BADGES).length;
}

function getTotalWordCount() {
  return Object.values(WORD_DATA).reduce((sum, c) => sum + c.words.length, 0);
}

function renderCollectionCount() {
  const { collection } = loadProgress();
  $('#collection-count').textContent = collection.length;
  $('#collection-total').textContent = getTotalWordCount();
}

function renderStreakBanner() {
  const { streak } = loadProgress();
  const banner = $('#streak-banner');
  $('#streak-days').textContent = streak;

  if (streak === 0) {
    banner.classList.add('cold');
    $('#streak-next').textContent = '오늘 첫 도전을 해보세요!';
  } else {
    banner.classList.remove('cold');
  }

  // 마일스톤 표시
  const milestones = [3, 7, 14, 30];
  let nextMilestone = null;
  document.querySelectorAll('.milestone').forEach(el => {
    el.classList.remove('next', 'reached');
    const day = parseInt(el.dataset.day);
    if (streak >= day) {
      el.classList.add('reached');
    } else if (nextMilestone === null) {
      nextMilestone = day;
      el.classList.add('next');
    }
  });

  if (nextMilestone !== null && streak > 0) {
    const remain = nextMilestone - streak;
    $('#streak-next').textContent = `다음 보상까지 ${remain}일! (${nextMilestone}일 차)`;
  } else if (streak >= 30) {
    $('#streak-next').textContent = '👑 출석 마스터! 계속 이어가세요!';
  }
}

function renderDailyCard() {
  const today = getTodayKey();
  const { dailyResults } = loadProgress();
  const todayResult = dailyResults[today];
  const btn = $('#daily-start-btn');
  const subtitle = $('#daily-subtitle');
  const btnText = $('#daily-btn-text');

  if (todayResult && todayResult.completed) {
    btn.disabled = true;
    btnText.textContent = `✅ 클리어! ${todayResult.correct}/${todayResult.total} 정답`;
    subtitle.textContent = `오늘 점수: ${todayResult.score}점 · 내일 새 챌린지가 옵니다`;
  } else {
    btn.disabled = false;
    btnText.textContent = '도전하기 ⚡';
    subtitle.textContent = '매일 자정에 갱신되는 5문제 (하루 1번)';
  }
}

function bindEvents() {
  // 모드 선택
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.click();
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.click();
      state.difficulty = btn.dataset.diff;
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  $('#start-btn').addEventListener('click', () => {
    SFX.click();
    startGame();
  });

  $('#answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitAnswer();
  });

  $('#hint-btn').addEventListener('click', () => {
    SFX.click();
    useHint();
  });

  $('#skip-btn').addEventListener('click', () => {
    SFX.skip();
    skipQuestion();
  });

  $('#sound-btn').addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    const btn = $('#sound-btn');
    btn.textContent = state.soundOn ? '🔊' : '🔇';
    btn.classList.toggle('muted', !state.soundOn);
    if (state.soundOn) SFX.click();
  });

  $('#retry-btn').addEventListener('click', () => {
    SFX.click();
    showScreen('game');
    startGame();
  });
  $('#home-btn').addEventListener('click', () => {
    SFX.click();
    showScreen('start');
    renderBestRecords();
    renderBadgeCount();
  });

  // 업적
  $('#badges-btn').addEventListener('click', () => {
    SFX.click();
    renderBadgesScreen();
    showScreen('badges');
  });
  $('#badges-back-btn').addEventListener('click', () => {
    SFX.click();
    showScreen('start');
  });

  // 도감
  $('#collection-btn').addEventListener('click', () => {
    SFX.click();
    renderCollectionScreen();
    showScreen('collection');
  });
  $('#collection-back-btn').addEventListener('click', () => {
    SFX.click();
    showScreen('start');
  });

  // 일일 챌린지
  $('#daily-start-btn').addEventListener('click', () => {
    if ($('#daily-start-btn').disabled) return;
    SFX.click();
    startDaily();
  });

  // 결과 공유
  $('#share-btn').addEventListener('click', shareResult);
}

// ===== Screen Switch =====
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

// ===== Mascot =====
function setMascot(face, line) {
  const faceEl = $('#mascot-face');
  const bubble = $('#speech-bubble');
  if (face) faceEl.textContent = face;
  if (line) {
    bubble.textContent = line;
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
  }
}

function getMascotStage() {
  let stage = 0;
  for (let i = MASCOT_EVOLUTION.length - 1; i >= 0; i--) {
    if (state.score >= MASCOT_EVOLUTION[i].threshold) {
      stage = i;
      break;
    }
  }
  return stage;
}

function checkMascotEvolution() {
  const newStage = getMascotStage();
  if (newStage > state.currentMascotStage) {
    state.currentMascotStage = newStage;
    const evo = MASCOT_EVOLUTION[newStage];
    const m = $('#game-mascot');
    m.classList.add('mascot-evolve');
    setTimeout(() => {
      setMascot(evo.face, `진화! ${evo.name}이(가) 됐어! ✨`);
    }, 300);
    setTimeout(() => m.classList.remove('mascot-evolve'), 1100);
    SFX.evolve();
    fireConfetti(60);
    if (newStage >= MASCOT_EVOLUTION.length - 1) {
      unlockBadge('evolved');
    }
  }
}

function mascotHappy() {
  const m = $('#game-mascot');
  m.classList.add('mascot-happy');
  setTimeout(() => m.classList.remove('mascot-happy'), 600);
}

function mascotSad() {
  const m = $('#game-mascot');
  m.classList.add('mascot-sad');
  setTimeout(() => m.classList.remove('mascot-sad'), 600);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== Game Flow =====
function startGame() {
  const config = DIFFICULTY[state.difficulty];
  const pool = WORD_DATA[state.selectedCategory].words;

  // 일반 모드일 때만 일일 모드 플래그 해제
  state.isDailyMode = false;

  // 모드별 문제 준비
  const shuffled = [...pool].sort(() => Math.random() - 0.5).map(w => ({ ...w, category: state.selectedCategory }));
  if (state.mode === 'classic') {
    state.questions = shuffled.slice(0, Math.min(TOTAL_QUESTIONS, pool.length));
  } else {
    // 서바이벌/스피드런: 큰 풀에서 끝없이 (반복 허용)
    state.questions = shuffled.concat(...Array(5).fill(0).map(() =>
      [...pool].sort(() => Math.random() - 0.5).map(w => ({ ...w, category: state.selectedCategory }))
    ));
  }

  state.currentIdx = 0;
  state.score = 0;
  state.hintsRemaining = config.hints;
  state.hintsUsedTotal = 0;
  state.results = [];
  state.combo = 0;
  state.maxCombo = 0;
  state.lives = SURVIVAL_LIVES;
  state.inventory = { time: 0, reveal: 0, double: 0 };
  state.itemsUsedTotal = 0;
  state.currentMascotStage = 0;
  state.newBadgesThisGame = [];
  state.doubleScoreActive = false;
  state.globalTimeLeft = SPEEDRUN_TIME;

  // 출석 보상 아이템 지급
  applyPendingItems();

  // 모드별 UI
  $('#lives-display').classList.toggle('active', state.mode === 'survival');
  if (state.mode === 'speedrun') {
    $('#progress-label').textContent = '맞힘';
  } else {
    $('#progress-label').textContent = '문제';
  }

  updateLivesUI();
  updateComboUI();
  updateInventoryUI();

  showScreen('game');
  loadQuestion();

  // 스피드런: 글로벌 타이머 시작
  if (state.mode === 'speedrun') {
    startGlobalTimer();
  }
}

function startDaily() {
  const today = getTodayKey();
  const { dailyResults } = loadProgress();
  if (dailyResults[today] && dailyResults[today].completed) {
    return;
  }

  // Daily 모드: 클래식 베이스, 쉬움 난이도, 5문제
  state.mode = 'classic';
  state.difficulty = 'easy';
  state.isDailyMode = true;
  state.questions = getDailyQuestions(today);

  const config = DIFFICULTY[state.difficulty];
  state.currentIdx = 0;
  state.score = 0;
  state.hintsRemaining = config.hints;
  state.hintsUsedTotal = 0;
  state.results = [];
  state.combo = 0;
  state.maxCombo = 0;
  state.lives = SURVIVAL_LIVES;
  state.inventory = { time: 0, reveal: 0, double: 0 };
  state.itemsUsedTotal = 0;
  state.currentMascotStage = 0;
  state.newBadgesThisGame = [];
  state.doubleScoreActive = false;
  state.globalTimeLeft = SPEEDRUN_TIME;

  applyPendingItems();

  $('#lives-display').classList.toggle('active', false);
  $('#progress-label').textContent = '오늘의 챌린지';

  updateLivesUI();
  updateComboUI();
  updateInventoryUI();

  showScreen('game');
  loadQuestion();
}

function startGlobalTimer() {
  clearInterval(state.globalTimer);
  state.globalTimer = setInterval(() => {
    state.globalTimeLeft -= 0.1;
    if (state.globalTimeLeft <= 0) {
      state.globalTimeLeft = 0;
      clearInterval(state.globalTimer);
      clearInterval(state.timer);
      endGame();
    }
  }, 100);
}

function loadQuestion() {
  if (state.mode === 'classic' && state.currentIdx >= state.questions.length) {
    endGame();
    return;
  }
  if (state.mode === 'survival' && state.lives <= 0) {
    endGame();
    return;
  }

  const config = DIFFICULTY[state.difficulty];
  const q = state.questions[state.currentIdx];
  state.hintLevel = 0;
  state.revealedPositions = new Set();

  // 모드별 시간 조정
  if (state.mode === 'survival') {
    // 서바이벌: 점점 빨라짐 (5문제마다 1초씩 감소, 최소 5초)
    const speedReduction = Math.floor(state.currentIdx / 5);
    state.timeLeft = Math.max(5, config.time - speedReduction);
  } else if (state.mode === 'speedrun') {
    state.timeLeft = state.globalTimeLeft;
  } else {
    state.timeLeft = config.time;
  }

  // 골든 문제 결정 (15% 확률, 클래식 모드만, 데일리 제외)
  state.isGolden = state.mode === 'classic' && !state.isDailyMode &&
                   Math.random() < 0.15 && state.currentIdx > 0;

  // UI 갱신
  if (state.mode === 'speedrun') {
    $('#question-count').textContent = `${state.results.filter(r => r.correct).length}`;
  } else if (state.mode === 'survival') {
    $('#question-count').textContent = `${state.currentIdx + 1}`;
  } else {
    $('#question-count').textContent = `${state.currentIdx + 1} / ${state.questions.length}`;
  }
  $('#score').textContent = state.score;

  // 카테고리 태그: 문제별 카테고리 우선 (데일리 모드는 문제마다 다름)
  const tagCat = q.category || state.selectedCategory;
  const tagInfo = WORD_DATA[tagCat] || WORD_DATA[state.selectedCategory];
  $('#category-tag').textContent = `${tagInfo.emoji} ${tagInfo.name}`;

  // 골든 라운드 표시
  $('#game-main').classList.toggle('golden', state.isGolden);
  $('#golden-banner').classList.toggle('active', state.isGolden);

  updateChosungDisplay();

  $('#hint-area').textContent = '';
  $('#hint-area').className = 'hint-area';
  $('#feedback').textContent = '';
  $('#feedback').className = 'feedback';
  $('#answer-input').value = '';
  $('#answer-input').disabled = false;
  $('#answer-input').focus();

  $('#hint-count').textContent = `(${state.hintsRemaining})`;
  $('#hint-btn').disabled = state.hintsRemaining <= 0;
  $('#skip-btn').disabled = false;

  if (state.isGolden) {
    SFX.golden();
    setMascot('🤩', pickRandom(MASCOT_LINES.golden));
  } else {
    setMascot(MASCOT_EVOLUTION[state.currentMascotStage].face, pickRandom(MASCOT_LINES.ready));
  }
  startTimer();
}

function updateChosungDisplay() {
  const q = state.questions[state.currentIdx];
  if (!q) return;
  const display = $('#chosung-display');
  display.className = 'chosung-display';
  display.innerHTML = '';
  const chosung = getChosung(q.word);
  [...chosung].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'chosung-char';
    // 공개된 위치는 실제 글자로 표시
    if (state.revealedPositions.has(i)) {
      span.textContent = q.word[i];
      span.style.color = '#9775fa';
    } else {
      span.textContent = ch;
    }
    span.style.animationDelay = (i * 0.06) + 's';
    display.appendChild(span);
  });
}

function startTimer() {
  clearInterval(state.timer);
  let lastTickSecond = Math.ceil(state.timeLeft);
  updateTimerUI();

  state.timer = setInterval(() => {
    if (state.mode === 'speedrun') {
      // 스피드런은 글로벌 타이머가 곧 문제 타이머
      state.timeLeft = state.globalTimeLeft;
      updateTimerUI();
      if (state.timeLeft <= 0) {
        clearInterval(state.timer);
      }
      return;
    }

    state.timeLeft -= 0.1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateTimerUI();
      clearInterval(state.timer);
      timeUp();
    } else {
      const currentSecond = Math.ceil(state.timeLeft);
      if (currentSecond !== lastTickSecond && currentSecond <= 3 && currentSecond > 0) {
        SFX.tick();
        lastTickSecond = currentSecond;
      }
      updateTimerUI();
    }
  }, 100);
}

function updateTimerUI() {
  let totalTime;
  if (state.mode === 'speedrun') {
    totalTime = SPEEDRUN_TIME;
  } else if (state.mode === 'survival') {
    const speedReduction = Math.floor(state.currentIdx / 5);
    totalTime = Math.max(5, DIFFICULTY[state.difficulty].time - speedReduction);
  } else {
    totalTime = DIFFICULTY[state.difficulty].time;
  }

  const t = Math.ceil(state.timeLeft);
  $('#timer').textContent = t;

  const percent = Math.max(0, (state.timeLeft / totalTime) * 100);
  const fill = $('#progress-fill');
  fill.style.width = percent + '%';

  const timerBox = $('#timer-box');
  if (state.timeLeft <= 5) {
    timerBox.classList.add('warning');
    fill.classList.add('warning');
  } else {
    timerBox.classList.remove('warning');
    fill.classList.remove('warning');
  }
}

// ===== Lives =====
function updateLivesUI() {
  if (state.mode !== 'survival') return;
  const display = $('#lives-display');
  display.innerHTML = '';
  for (let i = 0; i < SURVIVAL_LIVES; i++) {
    const span = document.createElement('span');
    span.className = 'life-icon' + (i >= state.lives ? ' lost' : '');
    span.textContent = '❤️';
    display.appendChild(span);
  }
}

function loseLife() {
  state.lives--;
  updateLivesUI();
  SFX.life_lost();
  if (state.lives <= 0) {
    setTimeout(() => endGame(), 1500);
    return true;
  }
  return false;
}

// ===== Inventory =====
function updateInventoryUI() {
  const bar = $('#items-bar');
  bar.innerHTML = '';
  Object.entries(state.inventory).forEach(([key, count]) => {
    if (count <= 0) return;
    const slot = document.createElement('button');
    slot.className = 'item-slot';
    slot.title = ITEMS[key].name + ' - ' + ITEMS[key].desc;
    slot.innerHTML = `${ITEMS[key].emoji}<span class="item-count">${count}</span>`;
    if (key === 'double' && state.doubleScoreActive) {
      slot.classList.add('active-effect');
    }
    slot.addEventListener('click', () => useItem(key));
    bar.appendChild(slot);
  });
}

function useItem(key) {
  if (state.inventory[key] <= 0) return;
  if (key === 'double' && state.doubleScoreActive) return;
  state.inventory[key]--;
  state.itemsUsedTotal++;
  ITEMS[key].use(state);
  SFX.item();
  updateInventoryUI();

  if (state.itemsUsedTotal >= 5) unlockBadge('collector');
}

function tryDropItem() {
  // 정답 시 30% 확률로 아이템 드롭, 콤보가 높을수록 확률 증가
  const dropChance = 0.25 + Math.min(state.combo * 0.04, 0.3);
  if (Math.random() > dropChance) return;
  const keys = Object.keys(ITEMS);
  const key = keys[Math.floor(Math.random() * keys.length)];
  state.inventory[key]++;
  updateInventoryUI();
  showFloatingText(`🎁 ${ITEMS[key].emoji}`, '#ffd93d');
}

// ===== Answer =====
function submitAnswer() {
  const input = $('#answer-input');
  const userAnswer = input.value.trim();
  if (!userAnswer) return;

  const q = state.questions[state.currentIdx];
  const correct = userAnswer.replace(/\s/g, '') === q.word.replace(/\s/g, '');

  if (correct) handleCorrect();
  else handleWrong();
}

function handleCorrect() {
  clearInterval(state.timer);
  const config = DIFFICULTY[state.difficulty];
  const q = state.questions[state.currentIdx];

  // 점수 계산
  const timeBonus = Math.floor(state.timeLeft);
  const hintPenalty = state.hintLevel * 3;
  let baseEarned = Math.max(5, config.basePoints + timeBonus - hintPenalty);

  // 콤보 보너스
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  const comboBonus = state.combo >= 2 ? state.combo * 5 : 0;
  let earned = baseEarned + comboBonus;

  // 더블 점수
  if (state.doubleScoreActive) {
    earned *= 2;
    state.doubleScoreActive = false;
  }

  // 골든 문제: 2배
  if (state.isGolden) {
    earned *= 2;
    unlockBadge('golden');
  }

  state.score += earned;

  state.results.push({
    word: q.word,
    chosung: getChosung(q.word),
    userAnswer: q.word,
    correct: true,
    skipped: false,
    earned,
  });

  // 단어 도감 추가 (정답 단어 수집)
  addToCollection(q.word);

  // 효과
  $('#chosung-display').classList.add('correct');
  $('#score').parentElement.classList.add('score-up');
  setTimeout(() => $('#score').parentElement.classList.remove('score-up'), 500);
  $('#score').textContent = state.score;

  showScorePopup(earned, comboBonus > 0, state.isGolden);
  fireConfetti(state.isGolden ? 100 : (state.combo >= 3 ? 80 : 40));

  if (state.isGolden) {
    SFX.golden();
  } else if (state.combo >= 3) {
    SFX.combo();
    setMascot('🤩', pickRandom(MASCOT_LINES.combo));
  } else {
    SFX.correct();
    setMascot('😍', pickRandom(MASCOT_LINES.correct));
  }
  mascotHappy();
  updateComboUI();

  // 아이템 드롭
  tryDropItem();

  // 업적 체크
  if (state.results.filter(r => r.correct).length === 1) unlockBadge('first_correct');
  if (state.combo >= 5) unlockBadge('combo_5');
  if (state.combo >= 10) unlockBadge('combo_10');
  if (state.score >= 500) unlockBadge('score_500');
  if (state.score >= 1000) unlockBadge('score_1000');

  // 진화 체크
  checkMascotEvolution();

  // 피드백
  let feedbackText = `✅ +${earned}점`;
  if (state.isGolden) feedbackText = `✨ 골든! +${earned}점!`;
  else if (comboBonus > 0) feedbackText = `✅ 정답! +${baseEarned} (콤보 +${comboBonus}!)`;

  $('#feedback').textContent = feedbackText;
  $('#feedback').className = 'feedback correct';
  $('#answer-input').disabled = true;
  $('#hint-btn').disabled = true;
  $('#skip-btn').disabled = true;

  setTimeout(() => {
    state.currentIdx++;
    loadQuestion();
  }, state.isGolden ? 1500 : 1300);
}

function handleWrong() {
  $('#chosung-display').classList.remove('shake');
  void $('#chosung-display').offsetWidth;
  $('#chosung-display').classList.add('shake');

  $('#feedback').textContent = '❌ 다시 생각해봐 멍!';
  $('#feedback').className = 'feedback wrong';

  SFX.wrong();
  setMascot('😵', pickRandom(MASCOT_LINES.wrong));
  mascotSad();

  $('#answer-input').value = '';
  $('#answer-input').focus();
}

function timeUp() {
  const q = state.questions[state.currentIdx];
  state.results.push({
    word: q.word,
    chosung: getChosung(q.word),
    userAnswer: $('#answer-input').value || '(시간초과)',
    correct: false,
    skipped: false,
    earned: 0,
  });

  state.combo = 0;
  updateComboUI();

  $('#feedback').textContent = `⏰ 시간 종료! 정답: ${q.word}`;
  $('#feedback').className = 'feedback wrong';

  SFX.timeup();
  setMascot('😭', pickRandom(MASCOT_LINES.timeout));
  mascotSad();

  $('#answer-input').disabled = true;
  $('#hint-btn').disabled = true;
  $('#skip-btn').disabled = true;

  // 서바이벌: 라이프 차감
  if (state.mode === 'survival') {
    if (loseLife()) return; // 게임 오버
  }

  setTimeout(() => {
    state.currentIdx++;
    loadQuestion();
  }, 1700);
}

function skipQuestion() {
  clearInterval(state.timer);
  const q = state.questions[state.currentIdx];

  state.results.push({
    word: q.word,
    chosung: getChosung(q.word),
    userAnswer: '(패스)',
    correct: false,
    skipped: true,
    earned: 0,
  });

  state.combo = 0;
  updateComboUI();

  $('#feedback').textContent = `⏭ 정답: ${q.word}`;
  $('#feedback').className = 'feedback skipped';
  setMascot('😅', pickRandom(MASCOT_LINES.skip));

  $('#answer-input').disabled = true;
  $('#hint-btn').disabled = true;
  $('#skip-btn').disabled = true;

  // 서바이벌: 패스해도 라이프 차감
  if (state.mode === 'survival') {
    if (loseLife()) return;
  }

  setTimeout(() => {
    state.currentIdx++;
    loadQuestion();
  }, 1300);
}

function useHint() {
  if (state.hintsRemaining <= 0) return;
  const q = state.questions[state.currentIdx];

  state.hintLevel++;
  state.hintsRemaining--;
  state.hintsUsedTotal++;
  $('#hint-count').textContent = `(${state.hintsRemaining})`;
  if (state.hintsRemaining <= 0) {
    $('#hint-btn').disabled = true;
  }

  const hintArea = $('#hint-area');
  hintArea.classList.remove('active');
  void hintArea.offsetWidth;
  hintArea.classList.add('active');

  if (state.hintLevel === 1) {
    hintArea.textContent = `💡 글자 수: ${q.word.length}자`;
  } else if (state.hintLevel === 2) {
    hintArea.textContent = `💡 ${q.hint}`;
  } else {
    hintArea.textContent = `💡 첫 글자: "${q.word[0]}"`;
  }
  setMascot('🤔', '힌트다 멍! 💡');
}

// ===== Combo UI =====
function updateComboUI() {
  const display = $('#combo-display');
  $('#combo-count').textContent = state.combo;
  if (state.combo >= 2) {
    display.classList.add('active');
    display.style.animation = 'none';
    void display.offsetWidth;
    display.style.animation = '';
  } else {
    display.classList.remove('active');
  }
}

// ===== Score Popup =====
function showScorePopup(amount, isCombo, isGolden) {
  const container = $('#score-popup-container');
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  let prefix = '+';
  let extra = '';
  if (isGolden) extra = ' ✨';
  else if (isCombo) extra = ' 🔥';
  popup.textContent = `${prefix}${amount}${extra}`;
  if (isGolden) popup.style.color = '#ffaa00';

  const rect = $('#chosung-display').getBoundingClientRect();
  popup.style.left = (rect.left + rect.width / 2) + 'px';
  popup.style.top = (rect.top + rect.height / 2) + 'px';

  container.appendChild(popup);
  setTimeout(() => popup.remove(), 1300);
}

function showFloatingText(text, color) {
  const container = $('#score-popup-container');
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  if (color) popup.style.color = color;

  const rect = $('#chosung-display').getBoundingClientRect();
  popup.style.left = (rect.left + rect.width / 2) + 'px';
  popup.style.top = (rect.top + 40) + 'px';

  container.appendChild(popup);
  setTimeout(() => popup.remove(), 1300);
}

// ===== Confetti =====
const CONFETTI_COLORS = ['#ff6b9d', '#ffd93d', '#4dabf7', '#20c997', '#ff8c42', '#9775fa', '#ff6b6b'];

function fireConfetti(count = 40) {
  const container = $('#confetti-container');
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    c.style.animationDelay = Math.random() * 0.3 + 's';
    c.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
    if (Math.random() < 0.5) c.style.borderRadius = '50%';
    else if (Math.random() < 0.5) c.style.transform = 'rotate(45deg)';
    const size = 6 + Math.random() * 12;
    c.style.width = size + 'px';
    c.style.height = size + 'px';
    container.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

// ===== Badges =====
function unlockBadge(key) {
  const { badges } = loadProgress();
  if (badges.includes(key)) return;
  badges.push(key);
  saveProgress({ badges });
  state.newBadgesThisGame.push(key);
  showBadgeToast(key);
}

function showBadgeToast(key) {
  const badge = BADGES[key];
  const toast = $('#badge-toast');
  $('#badge-toast-name').textContent = badge.name;
  toast.querySelector('.badge-toast-emoji').textContent = badge.emoji;
  toast.classList.add('show');
  SFX.badge();
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function renderBadgesScreen() {
  const { badges } = loadProgress();
  const grid = $('#badges-grid');
  grid.innerHTML = '';
  Object.entries(BADGES).forEach(([key, b]) => {
    const card = document.createElement('div');
    const unlocked = badges.includes(key);
    card.className = 'badge-card ' + (unlocked ? 'unlocked' : 'locked');
    card.innerHTML = `
      <span class="badge-card-emoji">${unlocked ? b.emoji : '🔒'}</span>
      <div class="badge-card-name">${b.name}</div>
      <div class="badge-card-desc">${b.desc}</div>
    `;
    grid.appendChild(card);
  });
}

// ===== End Game =====
function endGame() {
  clearInterval(state.timer);
  clearInterval(state.globalTimer);

  const correctCount = state.results.filter(r => r.correct).length;
  const totalQuestions = state.results.length || 1;
  const accuracy = Math.round((correctCount / totalQuestions) * 100);

  // 모드별 업적
  if (state.mode === 'classic') {
    if (correctCount === state.questions.length) unlockBadge('perfect');
    if (state.hintsUsedTotal === 0 && correctCount === state.questions.length) {
      unlockBadge('no_hint');
    }
  } else if (state.mode === 'speedrun') {
    if (correctCount >= 15) unlockBadge('speedster');
  } else if (state.mode === 'survival') {
    if (correctCount >= 20) unlockBadge('survivor');
  }

  // 데일리 모드 결과 저장
  if (state.isDailyMode) {
    const today = getTodayKey();
    const { dailyResults } = loadProgress();
    dailyResults[today] = {
      completed: true,
      correct: correctCount,
      total: state.questions.length,
      score: state.score,
      maxCombo: state.maxCombo,
    };
    saveProgress({ dailyResults });
  }

  // 신기록 체크 (데일리는 별도)
  const { bestScores } = loadProgress();
  const recordKey = state.isDailyMode ? 'daily' : state.mode;
  const isNewRecord = !state.isDailyMode &&
                      (!bestScores[recordKey] || state.score > bestScores[recordKey]);
  if (isNewRecord) {
    bestScores[recordKey] = state.score;
    saveProgress({ bestScores });
  }

  // 결과 통계 렌더
  const stats = $('#result-stats');
  stats.innerHTML = '';
  const statsData = [
    { label: '최종 점수', value: state.score },
    { label: state.mode === 'speedrun' ? '맞힌 문제' : '맞힌 문제', value: `${correctCount}${state.mode === 'classic' ? ' / ' + state.questions.length : ''}` },
    { label: '정답률', value: accuracy + '%' },
    { label: '최대 콤보', value: state.maxCombo + '🔥' },
  ];
  statsData.forEach(s => {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span>`;
    stats.appendChild(div);
  });

  // 신기록 배너
  $('#new-record-banner').classList.toggle('active', isNewRecord && state.score > 0);

  // 등급
  let emoji, title, grade;
  if (state.mode === 'classic') {
    if (accuracy === 100) { emoji = '🏆'; title = '완벽해요!'; grade = '초성 마스터 🌟'; }
    else if (accuracy >= 80) { emoji = '🎉'; title = '훌륭해요!'; grade = '초성 고수'; }
    else if (accuracy >= 60) { emoji = '👏'; title = '잘했어요!'; grade = '초성 중수'; }
    else if (accuracy >= 40) { emoji = '🙂'; title = '괜찮아요!'; grade = '초성 입문자'; }
    else { emoji = '💪'; title = '다음 기회에!'; grade = '연습이 필요해요'; }
  } else if (state.mode === 'survival') {
    if (correctCount >= 30) { emoji = '🦄'; title = '전설의 생존자!'; grade = '경이로운 기록'; }
    else if (correctCount >= 20) { emoji = '💪'; title = '대단해요!'; grade = '서바이벌 마스터'; }
    else if (correctCount >= 10) { emoji = '👏'; title = '잘 버텼어요!'; grade = '베테랑'; }
    else { emoji = '🐣'; title = '다시 도전!'; grade = '입문자'; }
  } else { // speedrun
    if (correctCount >= 25) { emoji = '⚡'; title = '광속의 손!'; grade = '스피드 마스터'; }
    else if (correctCount >= 15) { emoji = '🚀'; title = '엄청 빨라요!'; grade = '쾌속 플레이어'; }
    else if (correctCount >= 8) { emoji = '🏃'; title = '잘했어요!'; grade = '날렵한 손'; }
    else { emoji = '🐢'; title = '천천히 가도 OK'; grade = '워밍업 단계'; }
  }
  $('#result-emoji').textContent = emoji;
  $('#result-title').textContent = title;
  $('#result-grade').textContent = grade;

  // 새 업적 표시
  const newBadgesEl = $('#new-badges');
  newBadgesEl.innerHTML = '';
  if (state.newBadgesThisGame.length > 0) {
    state.newBadgesThisGame.forEach(key => {
      const b = BADGES[key];
      const div = document.createElement('div');
      div.className = 'new-badge-item';
      div.innerHTML = `<span style="font-size:18px;">${b.emoji}</span><span>${b.name}</span>`;
      newBadgesEl.appendChild(div);
    });
  }

  // 풀이 내역
  const list = $('#review-list');
  list.innerHTML = '';
  state.results.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'review-item';
    const status = r.correct
      ? `<span class="review-a correct">✓ ${r.word}</span>`
      : `<span class="review-a wrong">✗ ${r.word}</span>`;
    li.innerHTML = `<span class="review-q">${i + 1}. ${r.chosung}</span>${status}`;
    list.appendChild(li);
  });

  // 결과에 따라 컨페티/사운드
  const success = (state.mode === 'classic' && accuracy >= 60) ||
                  (state.mode === 'survival' && correctCount >= 10) ||
                  (state.mode === 'speedrun' && correctCount >= 8);
  if (success) {
    SFX.victory();
    fireConfetti(120);
  }

  // 데일리 모드: 공유 버튼 표시 + 등급 덮어쓰기
  const shareBtn = $('#share-btn');
  if (state.isDailyMode) {
    shareBtn.style.display = 'inline-flex';
    $('#result-title').textContent = '오늘의 챌린지 완료!';
    $('#result-grade').textContent = `${correctCount}/${state.questions.length} 정답 · ${state.score}점`;
    $('#result-emoji').textContent = correctCount === state.questions.length ? '🏆' : (correctCount >= 3 ? '🎉' : '💪');
  } else {
    shareBtn.style.display = 'none';
  }

  showScreen('result');
}

// ===== Collection Screen =====
function renderCollectionScreen() {
  const { collection } = loadProgress();
  const total = getTotalWordCount();
  const found = collection.length;
  const percent = total > 0 ? Math.round((found / total) * 100) : 0;

  $('#collection-progress-text').textContent = `${found} / ${total}`;
  $('#collection-percent').textContent = `${percent}%`;
  $('#collection-progress-fill').style.width = percent + '%';

  const list = $('#collection-list');
  list.innerHTML = '';

  Object.entries(WORD_DATA).forEach(([catKey, data]) => {
    const catFound = data.words.filter(w => collection.includes(w.word)).length;
    const catTotal = data.words.length;
    const section = document.createElement('div');
    section.className = 'collection-cat';
    section.innerHTML = `
      <div class="collection-cat-header">
        <span class="collection-cat-title">${data.emoji} ${data.name}</span>
        <span class="collection-cat-count">${catFound} / ${catTotal}</span>
      </div>
    `;
    const grid = document.createElement('div');
    grid.className = 'collection-words';
    data.words.forEach(w => {
      const isFound = collection.includes(w.word);
      const item = document.createElement('div');
      item.className = 'collection-word' + (isFound ? ' found' : '');
      if (isFound) {
        item.textContent = w.word;
        item.title = w.hint;
      } else {
        item.textContent = getChosung(w.word);
      }
      grid.appendChild(item);
    });
    section.appendChild(grid);
    list.appendChild(section);
  });
}

// ===== Share Result =====
function shareResult() {
  const today = getTodayKey();
  const correctCount = state.results.filter(r => r.correct).length;
  const total = state.questions.length;

  // 결과 이모지 라인 (정답=🟩, 오답=⬜)
  const emojiLine = state.results.map(r => r.correct ? '🟩' : '⬜').join('');

  const text = `🐶 멍멍 초성게임 데일리 ${today}\n` +
               `${correctCount}/${total} · ${state.score}점\n` +
               `${emojiLine}\n` +
               `https://jackykimsungsu.github.io/meong-meong-chosung/`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = $('#share-btn');
      const orig = btn.textContent;
      btn.textContent = '✅ 복사됨!';
      SFX.click();
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => {
      alert(text);
    });
  } else {
    alert(text);
  }
}

// ===== Start =====
init();
