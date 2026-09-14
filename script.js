/* ============================================================
   QuizSmart · Bible Quiz — Main Script
   ============================================================ */

(function() {
  'use strict';

  // ---------- CONFIG ----------
  // Replace CSV_URL with your published Google Form CSV link to use live data.
  // The fetch call is commented out below — the app currently uses SAMPLE_CSV.
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTv3ZwrZ0bWiR0k0lOUm4Qo8oK4QFH6XiePNOMFyLsPteb4im0FOx7DFidcOJAeItdkccGbq2jce-bQ/pub?gid=0&single=true&output=csv';

  // ---------- SAMPLE CSV (built-in fallback) ----------
  const SAMPLE_CSV = `Question_ID,Question_type_ID,Bible_Verse,Question_type,Question,Answer
1,1,John 3:16,Multiple Choice,"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.","John 3:16"
2,2,Genesis 1:1,True/False,"In the beginning God created the heaven and the earth.","True"
3,3,Psalm 23:1,Fill in the blank,"The Lord is my shepherd; I shall not _____.","want"
4,1,Matthew 5:9,Multiple Choice,"Blessed are the peacemakers: for they shall be called the children of _____.","God"
5,4,Romans 3:23,Short Answer,"For all have sinned, and come short of the glory of _____.","God"
6,2,Exodus 20:3,True/False,"Thou shalt have no other gods before me.","True"
7,1,Philippians 4:13,Multiple Choice,"I can do all things through _____ which strengtheneth me.","Christ"
8,3,Proverbs 3:5,Fill in the blank,"Trust in the Lord with all thine heart; and lean not unto thine own _____.","understanding"
9,4,John 14:6,Short Answer,"Jesus saith unto him, I am the way, the truth, and the _____.","life"
10,1,Acts 1:8,Multiple Choice,"But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the _____.","earth"`;

  // ---------- DOM refs ----------
  const startChapter = document.getElementById('startChapter');
  const startVerse = document.getElementById('startVerse');
  const endChapter = document.getElementById('endChapter');
  const endVerse = document.getElementById('endVerse');
  const startBtn = document.getElementById('startQuizBtn');
  const loadingEl = document.getElementById('loadingIndicator');
  const errorEl = document.getElementById('errorContainer');
  const filterPanel = document.getElementById('filterPanel');
  const quizPanel = document.getElementById('quizPanel');

  // quiz display elements
  const qTypeEl = document.getElementById('qType');
  const qVerseEl = document.getElementById('qVerse');
  const qTextEl = document.getElementById('qText');
  const answerContainer = document.getElementById('answerContainer');
  const aTextEl = document.getElementById('aText');
  const speakBtn = document.getElementById('speakBtn');
  const showAnswerBtn = document.getElementById('showAnswerBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  // ---------- STATE ----------
  let allQuestions = [];          // full parsed array
  let filteredQuestions = [];     // after chapter/verse filter
  let currentIndex = 0;           // index in filteredQuestions
  let answerVisible = false;
  let synth = window.speechSynthesis;
  let utterance = null;           // keep reference to avoid GC

  // ---------- CSV PARSER (simple but robust) ----------
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // parse with quote awareness (handles commas inside quotes)
      const values = [];
      let insideQuote = false;
      let current = '';
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          if (insideQuote && line[j + 1] === '"') {
            current += '"';
            j++; // skip next
          } else {
            insideQuote = !insideQuote;
          }
        } else if (ch === ',' && !insideQuote) {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current.trim());

      // map to object
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  }

  // ---------- EXTRACT CHAPTER/VERSE FROM Bible_Verse (e.g., "John 3:16") ----------
  function parseVerseReference(verseStr) {
    if (!verseStr) return { chapter: NaN, verse: NaN };
    const match = verseStr.match(/(\d+):(\d+)/);
    if (match) {
      return { chapter: parseInt(match[1], 10), verse: parseInt(match[2], 10) };
    }
    const nums = verseStr.match(/\d+/g);
    if (nums && nums.length >= 2) {
      return { chapter: parseInt(nums[0], 10), verse: parseInt(nums[1], 10) };
    }
    return { chapter: NaN, verse: NaN };
  }

  // ---------- POPULATE DROPDOWNS FROM DATA ----------
  function populateDropdowns(questions) {
    const chapterSet = new Set();
    const verseMap = new Map(); // chapter -> Set of verses

    questions.forEach(q => {
      const ref = parseVerseReference(q.Bible_Verse);
      if (!isNaN(ref.chapter)) {
        chapterSet.add(ref.chapter);
        if (!verseMap.has(ref.chapter)) verseMap.set(ref.chapter, new Set());
        if (!isNaN(ref.verse)) verseMap.get(ref.chapter).add(ref.verse);
      }
    });

    const chapters = Array.from(chapterSet).sort((a, b) => a - b);

    function fillSelect(selectEl, values, defaultVal) {
      selectEl.innerHTML = '';
      values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        selectEl.appendChild(opt);
      });
      if (defaultVal && values.includes(defaultVal)) selectEl.value = defaultVal;
    }

    fillSelect(startChapter, chapters, chapters[0]);
    fillSelect(endChapter, chapters, chapters[chapters.length - 1]);

    function updateVerseDropdown(chapterSelect, verseSelect, isStart) {
      const ch = parseInt(chapterSelect.value, 10);
      const verses = verseMap.has(ch) ? Array.from(verseMap.get(ch)).sort((a, b) => a - b) : [];
      if (verses.length === 0) {
        verseSelect.innerHTML = '<option value="">—</option>';
        return;
      }
      const prevVal = parseInt(verseSelect.value, 10);
      verseSelect.innerHTML = '';
      verses.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        verseSelect.appendChild(opt);
      });
      if (isStart) {
        verseSelect.value = verses[0];
      } else {
        verseSelect.value = verses[verses.length - 1];
      }
      if (!isNaN(prevVal) && verses.includes(prevVal)) verseSelect.value = prevVal;
    }

    updateVerseDropdown(startChapter, startVerse, true);
    updateVerseDropdown(endChapter, endVerse, false);

    startChapter.addEventListener('change', () => updateVerseDropdown(startChapter, startVerse, true));
    endChapter.addEventListener('change', () => updateVerseDropdown(endChapter, endVerse, false));

    startBtn.disabled = false;
  }

  // ---------- FILTER QUESTIONS BY CHAPTER/VERSE RANGE ----------
  function filterQuestions() {
    const sCh = parseInt(startChapter.value, 10);
    const sVs = parseInt(startVerse.value, 10);
    const eCh = parseInt(endChapter.value, 10);
    const eVs = parseInt(endVerse.value, 10);

    if (isNaN(sCh) || isNaN(sVs) || isNaN(eCh) || isNaN(eVs)) return [];

    return allQuestions.filter(q => {
      const ref = parseVerseReference(q.Bible_Verse);
      if (isNaN(ref.chapter) || isNaN(ref.verse)) return false;

      const startKey = sCh * 1000 + sVs;
      const endKey = eCh * 1000 + eVs;
      const refKey = ref.chapter * 1000 + ref.verse;
      return refKey >= startKey && refKey <= endKey;
    });
  }

  // ---------- RENDER CURRENT QUESTION ----------
  function renderQuestion() {
    if (!filteredQuestions.length) {
      qTypeEl.textContent = '—';
      qVerseEl.textContent = '—';
      qTextEl.textContent = 'No questions in this range.';
      answerContainer.classList.add('hidden');
      showAnswerBtn.classList.add('hidden-answer');
      answerVisible = false;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      progressText.textContent = '0 / 0';
      progressFill.style.width = '0%';
      return;
    }

    const q = filteredQuestions[currentIndex];
    qTypeEl.textContent = q.Question_type || 'Question';
    qVerseEl.textContent = q.Bible_Verse || '—';
    qTextEl.textContent = q.Question || '—';

    answerContainer.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden-answer');
    showAnswerBtn.innerHTML = '<span class="icon">🔍</span> Show Answer';
    answerVisible = false;

    const total = filteredQuestions.length;
    const currentNum = currentIndex + 1;
    progressText.textContent = `${currentNum} / ${total}`;
    progressFill.style.width = `${(currentNum / total) * 100}%`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === total - 1;

    aTextEl.textContent = q.Answer || '—';
  }

  // ---------- SHOW ANSWER TOGGLE ----------
  function toggleAnswer() {
    if (!filteredQuestions.length) return;
    answerVisible = !answerVisible;
    if (answerVisible) {
      answerContainer.classList.remove('hidden');
      showAnswerBtn.classList.add('hidden-answer');
      showAnswerBtn.innerHTML = '<span class="icon">🙈</span> Hide Answer';
    } else {
      answerContainer.classList.add('hidden');
      showAnswerBtn.classList.remove('hidden-answer');
      showAnswerBtn.innerHTML = '<span class="icon">🔍</span> Show Answer';
    }
  }

  // ---------- SPEECH (Web Speech API) ----------
  function speakQuestion() {
    if (!filteredQuestions.length) return;
    if (synth.speaking) synth.cancel();

    const q = filteredQuestions[currentIndex];
    const textToRead = `${q.Question_type || ''}. ${q.Question || ''}`;
    utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    synth.speak(utterance);
  }

  // ---------- START QUIZ ----------
  function startQuiz() {
    filteredQuestions = filterQuestions();
    currentIndex = 0;
    answerVisible = false;

    filterPanel.classList.add('hidden');
    quizPanel.classList.add('active');
    renderQuestion();
  }

  // ---------- NAVIGATION ----------
  function goPrev() {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion();
    }
  }

  function goNext() {
    if (currentIndex < filteredQuestions.length - 1) {
      currentIndex++;
      renderQuestion();
    }
  }

  // ---------- LOAD DATA (FETCH OR FALLBACK) ----------
  async function loadData() {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    try {
      // ---- LIVE FETCH (uncomment when you have a real CSV URL) ----
      /*
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const csvText = await response.text();
      */

      // ---- Using built-in sample for reliability ----
      const csvText = SAMPLE_CSV;

      const rows = parseCSV(csvText);
      if (rows.length === 0) throw new Error('No data rows found');

      allQuestions = rows.map(r => {
        const normalized = {};
        Object.keys(r).forEach(k => { normalized[k.trim()] = r[k]; });
        return normalized;
      });

      if (!allQuestions[0].hasOwnProperty('Bible_Verse') || !allQuestions[0].hasOwnProperty('Question')) {
        throw new Error('CSV missing required columns');
      }

      populateDropdowns(allQuestions);
      loadingEl.classList.add('hidden');

    } catch (err) {
      console.error(err);
      loadingEl.classList.add('hidden');
      errorEl.classList.remove('hidden');
      errorEl.textContent = `⚠️ Could not load quiz data: ${err.message}. Please try again later.`;
      startBtn.disabled = true;
    }
  }

  // ---------- EVENT LISTENERS ----------
  startBtn.addEventListener('click', startQuiz);
  showAnswerBtn.addEventListener('click', toggleAnswer);
  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);
  speakBtn.addEventListener('click', speakQuestion);

  window.addEventListener('beforeunload', () => {
    if (synth.speaking) synth.cancel();
  });

  // ---------- BOOTSTRAP ----------
  loadData();
})();
