/* ============================================================
   LKPD INTERAKTIF — PSEUDOCODE & DEBUGGING — KELAS 8
   ============================================================ */

'use strict';

/* ---------- KONFIGURASI (⚙️ TUNABLE) ---------- */
const CONFIG = {
  schoolName: 'SMP Harapan Bangsa',
  className: 'Kelas 8',
  passScore: 70,            // skor minimal lulus level
  hintPenalty: 5,           // pengurangan poin per hint
  soundDefault: true,
  levelsUnlockedSequentially: true, // jika false, semua level terbuka
  showHintButton: true,
  predikatThresholds: { sangatBaik: 90, baik: 80, cukup: 70 }
};

/* ---------- KAMUS ISTILAH (DWIBAHASA) ---------- */
const DICTIONARY = [
  { en: 'Debugging', id: 'menemukan dan memperbaiki kesalahan program' },
  { en: 'Bug', id: 'kesalahan pada program' },
  { en: 'Tracing / Desk-Checking', id: 'menelusuri nilai variabel baris demi baris' },
  { en: 'Syntax Error', id: 'kesalahan aturan penulisan' },
  { en: 'Logical Error', id: 'kesalahan logika berpikir' },
  { en: 'Input', id: 'data yang dimasukkan' },
  { en: 'Output', id: 'hasil yang ditampilkan' },
  { en: 'Variable', id: 'wadah penyimpan nilai sementara' }
];

/* ---------- STATE ---------- */
let state = {
  unlocked: [true, false, false],
  scores: [0, 0, 0],
  hintsUsed: [0, 0, 0],
  completed: [false, false, false],
  soundOn: CONFIG.soundDefault,
  studentName: ''
};

/* ---------- UTIL ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function loadState() {
  try {
    const saved = localStorage.getItem('lkpd_pseudocode_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (e) { /* abaikan */ }
}

function saveState() {
  try {
    localStorage.setItem('lkpd_pseudocode_state', JSON.stringify(state));
  } catch (e) { /* abaikan */ }
}

/* ---------- SUARA ---------- */
let audioCtx = null;
function playTone(freq, duration = 0.12, type = 'sine') {
  if (!state.soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* abaikan */ }
}
const soundCorrect = () => { playTone(880, 0.1); setTimeout(() => playTone(1320, 0.12), 100); };
const soundWrong = () => playTone(220, 0.2, 'square');
const soundClick = () => playTone(600, 0.05);

/* ---------- NAVIGASI ---------- */
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const btnHome = $('#btnHome');
  if (btnHome) {
    if (id === 'screen-map' || id === 'screen-splash' || id === 'screen-dictionary' || id === 'screen-tutorial') {
      btnHome.classList.add('is-hidden');
    } else {
      btnHome.classList.remove('is-hidden');
    }
  }
}

/* ---------- INISIALISASI ---------- */
function init() {
  loadState();
  renderDictionary();
  renderMap();
  bindEvents();
  updateMuteButton();
  updateProgressSummary();
  $('#brandSchool').textContent = `${CONFIG.schoolName} — ${CONFIG.className}`;
  if (state.studentName) $('#studentName').value = state.studentName;
}

/* ---------- KAMUS ---------- */
function renderDictionary() {
  const tbody = $('#dictionaryBody');
  if (!tbody) return;
  tbody.innerHTML = DICTIONARY.map(d =>
    `<tr><td><strong>${d.en}</strong></td><td>${d.id}</td></tr>`
  ).join('');
}

/* ---------- PETA LEVEL ---------- */
function renderMap() {
  for (let i = 0; i < 3; i++) {
    const card = $(`#cardLevel${i + 1}`);
    const status = $(`#statusLevel${i + 1}`);
    if (!card || !status) continue;
    const isUnlocked = state.unlocked[i];
    card.classList.toggle('locked', !isUnlocked);
    card.disabled = !isUnlocked;
    if (state.completed[i]) {
      status.textContent = `✅ Selesai — Skor ${state.scores[i]}`;
      status.className = 'level-status done';
    } else if (isUnlocked) {
      status.textContent = '▶️ Buka';
      status.className = 'level-status open';
    } else {
      status.textContent = '🔒 Terkunci';
      status.className = 'level-status locked';
    }
  }
  updateProgressSummary();
}

function updateProgressSummary() {
  const total = state.scores.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / 3);
  const done = state.completed.filter(Boolean).length;
  const el = $('#progressSummary');
  if (el) {
    el.textContent = `Level selesai: ${done}/3 · Total skor: ${total}/300 · Rata-rata: ${avg}/100`;
  }
}

/* ---------- LEVEL 1 ---------- */
function checkLevel1() {
  const answer = $('#answer1').value.trim();
  const fb = $('#feedback1');
  fb.className = 'feedback show';

  if (!answer) {
    fb.classList.add('error');
    fb.innerHTML = '❌ Jawaban masih kosong. Tulis pseudocode-mu dulu ya.';
    soundWrong();
    return 0;
  }

  const upper = answer.toUpperCase();
  let score = 0;
  const notes = [];

  const hasMulai = /\bMULAI\b/.test(upper);
  const hasSelesai = /\bSELESAI\b/.test(upper);
  const hasInput = /\bINPUT\b/.test(upper);
  const hasMod = /\bMOD\b/.test(upper) || /%/.test(answer);
  const hasDua = /2/.test(answer);
  const hasJika = /\bJIKA\b/.test(upper);
  const hasLainnya = /\bLAINNYA\b/.test(upper) || /\bELSE\b/.test(upper);
  const hasGenap = /GENAP/.test(upper);
  const hasGanjil = /GANJIL/.test(upper);

  if (hasMulai && hasSelesai) { score += 10; notes.push('✅ Struktur MULAI–SELESAI ada.'); }
  else notes.push('⚠️ Struktur MULAI dan SELESAI belum lengkap.');

  if (hasInput) { score += 20; notes.push('✅ Ada INPUT.'); }
  else notes.push('⚠️ Belum ada INPUT.');

  if (hasMod && hasDua) { score += 20; notes.push('✅ Ada pengecekan sisa bagi 2 (mod / %).'); }
  else notes.push('⚠️ Belum ada pengecekan sisa bagi 2 (mod / %).');

  if (hasJika && hasLainnya) { score += 25; notes.push('✅ Ada percabangan JIKA–LAINNYA.'); }
  else notes.push('⚠️ Percabangan JIKA–LAINNYA belum lengkap.');

  if (hasGenap && hasGanjil) { score += 25; notes.push('✅ Output "Genap" dan "Ganjil" ada.'); }
  else notes.push('⚠️ Output "Genap" dan/atau "Ganjil" belum ada.');

  // potong hint
  if (state.hintsUsed[0] > 0) {
    score = Math.max(0, score - CONFIG.hintPenalty * state.hintsUsed[0]);
    notes.push(`ℹ️ Pengurangan ${CONFIG.hintPenalty * state.hintsUsed[0]} poin karena memakai petunjuk.`);
  }

  state.scores[0] = score;
  state.completed[0] = score >= CONFIG.passScore;
  if (state.completed[0]) {
    state.unlocked[1] = true;
    soundCorrect();
  } else {
    soundWrong();
  }
  saveState();
  renderMap();

  fb.className = 'feedback show ' + (score >= CONFIG.passScore ? 'success' : 'error');
  fb.innerHTML = `<strong>Skor: ${score}/100</strong><br>${notes.join('<br>')}`;

  $('#model1').classList.remove('is-hidden');
  if (score >= CONFIG.passScore) {
    $('#btnSubmit1').classList.remove('is-hidden');
  }
  return score;
}

/* ---------- LEVEL 2 ---------- */
function checkTrace2() {
  const s1 = parseFloat($('#t2step1').value.trim());
  const s2 = parseFloat($('#t2step2').value.trim());
  const fin = parseFloat($('#t2final').value.trim());
  const out = parseFloat($('#t2output').value.trim());
  const fb = $('#feedback2trace');
  fb.className = 'feedback show';

  let score = 0;
  const notes = [];
  const correct = (val, target) => Math.abs(val - target) < 0.001;

  if (correct(s1, 32)) { score += 10; notes.push('✅ 80 × 0.4 = 32'); }
  else notes.push('❌ 80 × 0.4 seharusnya 32.');

  if (correct(s2, 36)) { score += 10; notes.push('✅ 90 × 0.4 = 36'); }
  else notes.push('❌ 90 × 0.4 seharusnya 36.');

  if (correct(fin, 68)) { score += 10; notes.push('✅ nilai_akhir = 68'); }
  else notes.push('❌ nilai_akhir seharusnya 68 (32 + 36).');

  if (correct(out, 68)) { score += 10; notes.push('✅ Output = 68'); }
  else notes.push('❌ Output seharusnya 68.');

  state.scores[1] = score;
  saveState();

  fb.className = 'feedback show ' + (score >= 40 ? 'success' : 'error');
  fb.innerHTML = `<strong>Skor tracing: ${score}/40</strong><br>${notes.join('<br>')}`;

  if (score >= 30) {
    $('#bugSection').disabled = false;
    fb.innerHTML += '<br>👍 Tabel tracing sudah cukup baik. Lanjut ke bagian "Temukan Bug"!';
  } else {
    soundWrong();
  }
  return score;
}

function checkBug2() {
  const selected = document.querySelector('input[name="bugline"]:checked');
  const fix = $('#fix2').value.trim();
  const fb = $('#feedback2bug');
  fb.className = 'feedback show';

  if (!selected) {
    fb.classList.add('error');
    fb.innerHTML = '❌ Pilih dulu baris yang mengandung bug.';
    soundWrong();
    return;
  }

  let score = 0;
  const notes = [];

  if (selected.value === '3') { score += 30; notes.push('✅ Baris 3 memang mengandung Logical Error.'); }
  else { notes.push('❌ Baris yang benar adalah baris 3.'); }

  // Validasi perbaikan
  const fixClean = fix.replace(/\s+/g, ' ').toLowerCase();
  let fixValid = false;
  if (/0\.5/.test(fixClean) && (fixClean.match(/0\.5/g) || []).length >= 2) fixValid = true;
  if (/0\.4/.test(fixClean) && /0\.2/.test(fixClean)) fixValid = true;
  if (/\(nilai_uts\s*\+\s*nilai_uas\)\s*\/\s*2/.test(fixClean)) fixValid = true;
  if (/\(nilai_uts\+nilai_uas\)\/2/.test(fixClean)) fixValid = true;
  if (/nilai_uts\s*\*\s*0\.5\s*\+\s*nilai_uas\s*\*\s*0\.5/.test(fixClean)) fixValid = true;
  if (/0\.4\s*\+\s*0\.4\s*\+\s*0\.2/.test(fixClean)) fixValid = true;

  if (fixValid) { score += 30; notes.push('✅ Perbaikan bobot sudah benar (total 100%).'); }
  else { notes.push('⚠️ Perbaikan belum tepat. Pastikan total bobot = 100% (1,0).'); }

  // Tambahkan skor tracing yang sudah didapat
  const tracingScore = state.scores[1] || 0;
  const total = Math.min(100, tracingScore + score);
  if (state.hintsUsed[1] > 0) {
    // hint penalty sudah diterapkan di tracing? Kita terapkan di total akhir
  }
  state.scores[1] = total;
  state.completed[1] = total >= CONFIG.passScore;
  if (state.completed[1]) {
    state.unlocked[2] = true;
    soundCorrect();
  } else {
    soundWrong();
  }
  saveState();
  renderMap();

  fb.className = 'feedback show ' + (total >= CONFIG.passScore ? 'success' : 'error');
  fb.innerHTML = `<strong>Skor total Level 2: ${total}/100</strong><br>${notes.join('<br>')}`;

  $('#model2').classList.remove('is-hidden');
  if (total >= CONFIG.passScore) {
    $('#btnSubmit2').classList.remove('is-hidden');
  }
}

/* ---------- LEVEL 3 ---------- */
function checkLevel3() {
  const answer = $('#answer3').value.trim();
  const fb = $('#feedback3');
  fb.className = 'feedback show';

  if (!answer) {
    fb.classList.add('error');
    fb.innerHTML = '❌ Jawaban masih kosong. Tulis pseudocode-mu dulu ya.';
    soundWrong();
    return 0;
  }

  const upper = answer.toUpperCase();
  let score = 0;
  const notes = [];

  const hasMulai = /\bMULAI\b/.test(upper);
  const hasSelesai = /\bSELESAI\b/.test(upper);
  const hasInput = /\bINPUT\b/.test(upper);
  const hasBerat = /BERAT/.test(upper);
  const hasTinggi = /TINGGI/.test(upper);
  const hasImt = /IMT/.test(upper) || /INDEKS/.test(upper);
  const hasDiv = /\//.test(answer);
  const hasKali = /\*/.test(answer) || /X/.test(answer);
  const countJika = (upper.match(/\bJIKA\b/g) || []).length;
  const hasLainnya = /\bLAINNYA\b/.test(upper) || /\bELSE\b/.test(upper);
  const hasKurus = /KURUS/.test(upper);
  const hasNormal = /NORMAL/.test(upper);
  const hasGemuk = /GEMUK/.test(upper);
  const has185 = /18[.,]5/.test(answer);
  const has25 = /25/.test(answer);

  if (hasMulai && hasSelesai) { score += 10; notes.push('✅ Struktur MULAI–SELESAI ada.'); }
  else notes.push('⚠️ MULAI / SELESAI belum lengkap.');

  if (hasInput && hasBerat && hasTinggi) { score += 15; notes.push('✅ INPUT berat dan tinggi ada.'); }
  else notes.push('⚠️ INPUT berat dan tinggi belum lengkap.');

  if (hasImt && hasDiv && hasKali) { score += 15; notes.push('✅ Rumus IMT = berat / (tinggi × tinggi) terlihat.'); }
  else notes.push('⚠️ Rumus IMT belum tepat.');

  if (countJika >= 2 && hasLainnya) { score += 30; notes.push('✅ Ada minimal 2 percabangan JIKA–LAINNYA.'); }
  else notes.push('⚠️ Percabangan JIKA–LAINNYA belum mencapai 2.');

  if (has185 && has25 && hasKurus && hasNormal && hasGemuk) { score += 30; notes.push('✅ Ketiga kategori (Kurus, Normal, Gemuk) dan batas 18,5 / 25 ada.'); }
  else notes.push('⚠️ Kategori atau batas IMT belum lengkap.');

  if (state.hintsUsed[2] > 0) {
    score = Math.max(0, score - CONFIG.hintPenalty * state.hintsUsed[2]);
    notes.push(`ℹ️ Pengurangan ${CONFIG.hintPenalty * state.hintsUsed[2]} poin karena memakai petunjuk.`);
  }

  state.scores[2] = score;
  state.completed[2] = score >= CONFIG.passScore;
  if (state.completed[2]) {
    soundCorrect();
  } else {
    soundWrong();
  }
  saveState();
  renderMap();

  fb.className = 'feedback show ' + (score >= CONFIG.passScore ? 'success' : 'error');
  fb.innerHTML = `<strong>Skor: ${score}/100</strong><br>${notes.join('<br>')}`;

  $('#model3').classList.remove('is-hidden');
  if (score >= CONFIG.passScore) {
    $('#btnSubmit3').classList.remove('is-hidden');
  }
  return score;
}

/* ---------- AKHIR LEVEL ---------- */
function showLevelEnd(level) {
  const score = state.scores[level - 1];
  const stars = score >= 90 ? '⭐⭐⭐' : score >= 80 ? '⭐⭐' : score >= 70 ? '⭐' : '☆';
  $('#levelEndTitle').textContent = `Level ${level} Selesai!`;
  $('#levelEndScore').textContent = score;
  $('#levelEndStars').textContent = stars;

  let msg = '';
  if (score >= 90) msg = 'Luar biasa! Pemahamanmu sangat baik.';
  else if (score >= 80) msg = 'Bagus sekali! Sedikit lagi sempurna.';
  else if (score >= 70) msg = 'Selamat, kamu lulus level ini!';
  else msg = 'Jangan menyerah, coba lagi ya.';
  $('#levelEndMsg').textContent = msg;

  const nextBtn = $('#btnLevelEndNext');
  if (level < 3 && state.completed[level - 1]) {
    nextBtn.textContent = `➡️ Lanjut ke Level ${level + 1}`;
    nextBtn.classList.remove('is-hidden');
  } else if (level === 3 && state.completed[2]) {
    nextBtn.textContent = '🏆 Lihat Hasil Akhir';
    nextBtn.classList.remove('is-hidden');
  } else {
    nextBtn.classList.add('is-hidden');
  }

  showScreen('screen-levelend');
}

/* ---------- AKHIR GAME ---------- */
function showGameEnd() {
  const total = state.scores.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / 3);
  $('#gameEndScore').textContent = avg;

  let predikat = 'Perlu Latihan Lagi';
  if (avg >= CONFIG.predikatThresholds.sangatBaik) predikat = 'Sangat Baik';
  else if (avg >= CONFIG.predikatThresholds.baik) predikat = 'Baik';
  else if (avg >= CONFIG.predikatThresholds.cukup) predikat = 'Cukup';

  $('#gameEndPredikat').textContent = `Predikat: ${predikat}`;
  const stars = avg >= 90 ? '⭐⭐⭐' : avg >= 80 ? '⭐⭐' : avg >= 70 ? '⭐' : '☆';
  $('#gameEndStars').textContent = stars;

  // Aspek
  const aspek = [
    { name: 'Struktur pseudocode', score: avg >= 90 ? 4 : avg >= 80 ? 3 : avg >= 70 ? 2 : 1 },
    { name: 'Ketepatan logika', score: avg >= 90 ? 4 : avg >= 80 ? 3 : avg >= 70 ? 2 : 1 },
    { name: 'Proses debugging (tracing)', score: avg >= 90 ? 4 : avg >= 80 ? 3 : avg >= 70 ? 2 : 1 }
  ];
  const ket = ['Tidak jelas', 'Ada bagian hilang', 'Lengkap, kurang runtut', 'Lengkap & runtut'];
  $('#aspectBody').innerHTML = aspek.map(a =>
    `<tr><td>${a.name}</td><td>${a.score}</td><td>${ket[a.score - 1]}</td></tr>`
  ).join('');

  // Sertifikat
  const name = $('#studentName').value.trim() || 'Murid Hebat';
  $('#certName').textContent = name;
  $('#certPredikat').textContent = predikat;
  $('#certScore').textContent = avg;
  $('#certSchool').textContent = CONFIG.schoolName;
  const now = new Date();
  $('#certDate').textContent = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  showScreen('screen-gameend');
}

/* ---------- RESET ---------- */
function resetProgress() {
  if (!confirm('Yakin ingin mereset semua progres? Semua skor dan level akan kembali ke awal.')) return;
  state = {
    unlocked: [true, false, false],
    scores: [0, 0, 0],
    hintsUsed: [0, 0, 0],
    completed: [false, false, false],
    soundOn: state.soundOn,
    studentName: ''
  };
  saveState();
  renderMap();
  showScreen('screen-map');
}

/* ---------- BIND EVENTS ---------- */
function bindEvents() {
  // Splash
  $('#btnStart').addEventListener('click', () => { soundClick(); showScreen('screen-map'); });
  $('#btnSplashDictionary').addEventListener('click', () => { soundClick(); showScreen('screen-dictionary'); });

  // Dictionary
  $('#btnDictionary').addEventListener('click', () => { soundClick(); showScreen('screen-dictionary'); });
  $('#btnOpenDictionary2').addEventListener('click', () => { soundClick(); showScreen('screen-dictionary'); });
  $('#btnDictBack').addEventListener('click', () => { soundClick(); showScreen('screen-map'); });

  // Tutorial
  $('#btnOpenTutorial').addEventListener('click', () => { soundClick(); showScreen('screen-tutorial'); });
  $('#btnTutorialBack').addEventListener('click', () => { soundClick(); showScreen('screen-map'); });

  // Map cards
  [1, 2, 3].forEach(i => {
    $(`#cardLevel${i}`).addEventListener('click', () => {
      if (!state.unlocked[i - 1]) return;
      soundClick();
      showScreen(`screen-level${i}`);
      if (i === 2 && state.scores[1] >= 40) {
        $('#bugSection').disabled = false;
      }
    });
  });

  // Mute
  $('#btnMute').addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    saveState();
    updateMuteButton();
    if (state.soundOn) soundClick();
  });

  // Home
  $('#btnHome').addEventListener('click', () => {
    const active = $('.screen.active');
    if (active && active.id.startsWith('screen-level')) {
      if (!confirm('Keluar dari level? Progres level ini mungkin belum tersimpan sepenuhnya.')) return;
    }
    showScreen('screen-map');
  });

  // Level 1
  $('#btnCheck1').addEventListener('click', () => { soundClick(); checkLevel1(); });
  $('#btnHint1').addEventListener('click', () => {
    if (!CONFIG.showHintButton) return;
    state.hintsUsed[0]++;
    saveState();
    $('#hint1').classList.remove('is-hidden');
    soundClick();
  });
  $('#btnReset1').addEventListener('click', () => {
    $('#answer1').value = '';
    $('#feedback1').className = 'feedback';
    $('#model1').classList.add('is-hidden');
    $('#btnSubmit1').classList.add('is-hidden');
    soundClick();
  });
  $('#btnSubmit1').addEventListener('click', () => { soundClick(); showLevelEnd(1); });

  // Level 2
  $('#btnCheckTrace2').addEventListener('click', () => { soundClick(); checkTrace2(); });
  $('#btnHint2').addEventListener('click', () => {
    if (!CONFIG.showHintButton) return;
    state.hintsUsed[1]++;
    saveState();
    $('#hint2').classList.remove('is-hidden');
    soundClick();
  });
  $('#btnReset2').addEventListener('click', () => {
    ['t2step1','t2step2','t2final','t2output','fix2'].forEach(id => { const el = $('#'+id); if (el) el.value = ''; });
    $('#feedback2trace').className = 'feedback';
    $('#feedback2bug').className = 'feedback';
    $('#bugSection').disabled = true;
    $('#model2').classList.add('is-hidden');
    $('#btnSubmit2').classList.add('is-hidden');
    soundClick();
  });
  $('#btnCheckBug2').addEventListener('click', () => { soundClick(); checkBug2(); });
  $('#btnSubmit2').addEventListener('click', () => { soundClick(); showLevelEnd(2); });

  // Level 3
  $('#btnCheck3').addEventListener('click', () => { soundClick(); checkLevel3(); });
  $('#btnHint3').addEventListener('click', () => {
    if (!CONFIG.showHintButton) return;
    state.hintsUsed[2]++;
    saveState();
    $('#hint3').classList.remove('is-hidden');
    soundClick();
  });
  $('#btnReset3').addEventListener('click', () => {
    $('#answer3').value = '';
    $('#feedback3').className = 'feedback';
    $('#model3').classList.add('is-hidden');
    $('#btnSubmit3').classList.add('is-hidden');
    soundClick();
  });
  $('#btnSubmit3').addEventListener('click', () => { soundClick(); showLevelEnd(3); });

  // Level end
  $('#btnLevelEndNext').addEventListener('click', () => {
    soundClick();
    const current = state.scores.findIndex((_, i) => !state.completed[i]);
    // cari level yang baru diselesaikan
    const level = state.completed.lastIndexOf(true) + 1;
    if (level === 3 && state.completed[2]) {
      showGameEnd();
    } else if (level < 3) {
      showScreen(`screen-level${level + 1}`);
    } else {
      showScreen('screen-map');
    }
  });
  $('#btnLevelEndRetry').addEventListener('click', () => {
    soundClick();
    const level = state.completed.lastIndexOf(true) + 1;
    if (level >= 1 && level <= 3) showScreen(`screen-level${level}`);
  });
  $('#btnLevelEndMap').addEventListener('click', () => { soundClick(); showScreen('screen-map'); });

  // Game end
  $('#btnPrintCert').addEventListener('click', () => {
    state.studentName = $('#studentName').value.trim();
    saveState();
    const name = state.studentName || 'Murid Hebat';
    $('#certName').textContent = name;
    window.print();
  });
  $('#btnPlayAgain').addEventListener('click', () => {
    soundClick();
    resetProgress();
  });
  $('#btnGameEndMap').addEventListener('click', () => { soundClick(); showScreen('screen-map'); });
  $('#studentName').addEventListener('input', () => {
    state.studentName = $('#studentName').value.trim();
    saveState();
  });

  // Reset
  $('#btnResetProgress').addEventListener('click', resetProgress);
}

function updateMuteButton() {
  const btn = $('#btnMute');
  if (!btn) return;
  btn.textContent = state.soundOn ? '🔊 Suara: Aktif' : '🔇 Suara: Mati';
  btn.setAttribute('aria-pressed', state.soundOn ? 'false' : 'true');
}

/* ---------- JALANKAN ---------- */
document.addEventListener('DOMContentLoaded', init);