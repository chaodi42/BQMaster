/* ============================================================
   QuizSmart · Bible Quiz — Main Script
   ============================================================ */

(function() {
  'use strict';

  // ---------- CONFIG ----------
  // Published Google Form CSV URL
  // The &v=2 parameter forces a fresh copy if headers were recently changed.
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTv3ZwrZ0bWiR0k0lOUm4Qo8oK4QFH6XiePNOMFyLsPteb4im0FOx7DFidcOJAeItdkccGbq2jce-bQ/pub?gid=0&single=true&output=csv&v=2';

  // ---------- SAMPLE CSV (fallback if fetch fails) ----------
  const SAMPLE_CSV = `Question_ID,Question_Type_ID,Bible_Verse,Question_Type,Question,Answer
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
  const subheadBanner = document.getElementById('subheadBanner');
  const quizPanel = document.getElementById('quizPanel');
  const startRandomBtn = document.getElementById('startRandomBtn');
  const stopSpeakBtn = document.getElementById('stopSpeakBtn');
  const startOverBtn = document.getElementById('startOverBtn');

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
  const synth = window.speechSynthesis;

  // ---------- CSV PARSER ----------
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

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  }

  // ---------- FIELD HELPER (case/space/underscore-insensitive) ----------
  // Lets us match 'Question_Type', 'Question Type', 'question_type', etc.
  function getField(q, fieldName) {
    if (!q) return '';
    const target = fieldName.toLowerCase().replace(/[\s_]/g, '');
    for (const key in q) {
      const cleanKey = key.toLowerCase().replace(/[\s_]/g, '');
      if (cleanKey === target) return q[key];
    }
    return '';
  }

  // ---------- EXTRACT CHAPTER/VERSE FROM Bible_Verse ----------
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

  // ---------- POPULATE DROPDOWNS ----------
  function populateDropdowns(questions) {
    const chapterSet = new Set();
    const verseMap = new Map(); // chapter -> Set of verses

    questions.forEach(q => {
      const ref = parseVerseReference(getField(q, 'Bible_Verse'));
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
      if (defaultVal !== undefined && values.includes(defaultVal)) selectEl.value = defaultVal;
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
    startRandomBtn.disabled = false;
  }

  // ---------- FILTER QUESTIONS BY CHAPTER/VERSE RANGE ----------
  function filterQuestions() {
    const sCh = parseInt(startChapter.value, 10);
    const sVs = parseInt(startVerse.value, 10);
    const eCh = parseInt(endChapter.value, 10);
    const eVs = parseInt(endVerse.value, 10);

    if (isNaN(sCh) || isNaN(sVs) || isNaN(eCh) || isNaN(eVs)) return [];

    return allQuestions.filter(q => {
      const ref = parseVerseReference(getField(q, 'Bible_Verse'));
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
      showAnswerBtn.innerHTML = '<span class="icon">🔍</span> Show Answer';
      answerVisible = false;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      progressText.textContent = '0 / 0';
      progressFill.style.width = '0%';
      return;
    }

    const q = filteredQuestions[currentIndex];

    // Use case/space-insensitive field lookups so any header spelling works
    const typeValue = getField(q, 'Question_Type') || 'Question';
    const verseValue = getField(q, 'Bible_Verse') || '—';
    const questionValue = getField(q, 'Question') || '—';
    const answerValue = getField(q, 'Answer') || '—';

    qTypeEl.textContent = typeValue;
    qVerseEl.textContent = verseValue;
    qTextEl.textContent = questionValue;

    // Reset answer visibility on every new question
    answerContainer.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden-answer');
    showAnswerBtn.innerHTML = '<span class="icon">🔍</span> Show Answer';
    answerVisible = false;

    // Progress bar
    const total = filteredQuestions.length;
    const currentNum = currentIndex + 1;
    progressText.textContent = `${currentNum} / ${total}`;
    progressFill.style.width = `${(currentNum / total) * 100}%`;

    // Nav button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === total - 1;

    // Pre-fill answer content (hidden until toggled)
    aTextEl.textContent = answerValue;
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

  // ---------- SPEECH (Web Speech API) with pauses ----------
  // Sequence: Question_Type → 3s pause → "Question" → 2s pause → Question content
  function speakQuestion() {
     const PAUSE_AFTER_TYPE = 2000;    // pause after question type
     const PAUSE_AFTER_LABEL = 2000;   // pause after the word "Question"
     
    if (!filteredQuestions.length) return;

    // Cancel any ongoing speech
    if (synth.speaking) synth.cancel();

    const q = filteredQuestions[currentIndex];
    const questionType = (getField(q, 'Question_Type') || '').trim();
    const questionText = (getField(q, 'Question') || '').trim();

    // Helper to build an utterance with consistent settings
    function makeUtterance(text) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.pitch = 1;
      return u;
    }

    // If there's no question type, just read the question content after 2s
    if (!questionType) {
      setTimeout(function() {
        synth.speak(makeUtterance(questionText));
      }, 2000);
      return;
    }

    // Step 1: Speak the question type
    const typeUtterance = makeUtterance(questionType);

    // When type finishes → wait 3s → speak "Question"
    typeUtterance.onend = function() {
      setTimeout(function() {
        const labelUtterance = makeUtterance('Question');

        // When "Question" finishes → wait 2s → speak content
        labelUtterance.onend = function() {
          setTimeout(function() {
            synth.speak(makeUtterance(questionText));
          }, PAUSE_AFTER_LABEL);
        };

        synth.speak(labelUtterance);
      }, PAUSE_AFTER_TYPE);
    };

    synth.speak(typeUtterance);
  }
  // ---------- STOP SPEECH ----------
  function stopSpeaking() {
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }
  }

  // ---------- SHUFFLE (Fisher–Yates) ----------
  function shuffleArray(arr) {
    const a = arr.slice(); // don't mutate original
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // ---------- START QUIZ ----------
  function startQuiz(randomOrder) {
    const base = filterQuestions();
    filteredQuestions = randomOrder ? shuffleArray(base) : base;
    currentIndex = 0;
    answerVisible = false;

    // Hide the banner + filter panel, show the quiz
    subheadBanner.classList.add('hidden');
    filterPanel.classList.add('hidden');
    quizPanel.classList.add('active');
    renderQuestion();
  }
   // ---------- START OVER ----------
  function startOver() {
    // Stop any ongoing speech
    stopSpeaking();

    // Reset quiz state
    filteredQuestions = [];
    currentIndex = 0;
    answerVisible = false;

    // Reset answer visibility & progress display
    answerContainer.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden-answer');
    showAnswerBtn.innerHTML = '<span class="icon">🔍</span> Show Answer';
    progressFill.style.width = '0%';
    progressText.textContent = '0 / 0';

    // Show the banner + filter panel again, hide the quiz
    subheadBanner.classList.remove('hidden');
    quizPanel.classList.remove('active');
    filterPanel.classList.remove('hidden');
  }
  // ---------- NAVIGATION ----------
  function goPrev() {
    if (currentIndex > 0) {
      currentIndex--;
      if (synth.speaking) synth.cancel();
      renderQuestion();
    }
  }

  function goNext() {
    if (currentIndex < filteredQuestions.length - 1) {
      currentIndex++;
      if (synth.speaking) synth.cancel();
      renderQuestion();
    }
  }

  // ---------- LOAD DATA (FETCH FROM GOOGLE FORM CSV) ----------
  async function loadData() {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');

    let csvText;

    // ---- Try live fetch first, fall back to sample data ----
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      csvText = await response.text();
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('Empty response from CSV URL');
      }
    } catch (fetchErr) {
      console.warn('Live fetch failed, falling back to sample data:', fetchErr);
      csvText = SAMPLE_CSV;
    }

    // ---- Parse and populate ----
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) throw new Error('No data rows found');

      // Normalize column names (trim only; getField handles the rest)
      allQuestions = rows.map(r => {
        const normalized = {};
        Object.keys(r).forEach(k => {
          normalized[k.trim()] = r[k];
        });
        return normalized;
      });

      // Sanity check for required columns (case-insensitive)
      const first = allQuestions[0];
      const keys = Object.keys(first);
      const hasVerse = keys.some(k => k.toLowerCase().replace(/[\s_]/g, '') === 'bibleverse');
      const hasQuestion = keys.some(k => k.toLowerCase().replace(/[\s_]/g, '') === 'question');
      if (!hasVerse || !hasQuestion) {
        throw new Error('CSV missing required columns (Bible_Verse / Question)');
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
  startBtn.addEventListener('click', () => startQuiz(false));
  startRandomBtn.addEventListener('click', () => startQuiz(true));
  showAnswerBtn.addEventListener('click', toggleAnswer);
  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);
  speakBtn.addEventListener('click', speakQuestion);
  stopSpeakBtn.addEventListener('click', stopSpeaking); 
  startOverBtn.addEventListener('click', startOver);
   
  window.addEventListener('beforeunload', () => {
    if (synth.speaking) synth.cancel();
  });

  // ---------- BOOTSTRAP ----------
  loadData();
})();
