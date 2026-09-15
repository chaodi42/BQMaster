# QuizSmart · Bible Quiz 📘

A lightweight, fully client-side Bible quiz web app that loads questions from a published Google Form (CSV), filters them by verse range, and reads them aloud using the browser's Web Speech API.

**Live demo:** `https://chaodi42.github.io/BQMaster/`

---

## ✨ Features

- **Verse-range filtering** — pick a start and end chapter/verse with four dropdowns
- **Two quiz modes** — start in original order, or shuffle questions randomly
- **Read aloud** — Web Speech API reads the question type, then the question, with configurable pauses
- **Stop reading** — instantly cancel any ongoing speech
- **Show/Hide answer** — toggle answers inline without refreshing the page
- **Progress bar** — shows current question number out of the total
- **Previous / Next navigation** — move freely between questions
- **Fully responsive** — works on desktop, iPad, and mobile
- **No build step** — pure HTML, CSS, and JavaScript
- **No backend** — data comes straight from a published Google Sheet

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, flexbox, media queries) |
| Logic | Vanilla JavaScript (ES2017+, async/await) |
| Data source | Published Google Form/Sheet CSV |
| Text-to-speech | Web Speech API (`speechSynthesis`) |
| Hosting | GitHub Pages (deploy from branch) |

No frameworks, no bundlers, no dependencies — everything runs in the browser.

---

## 📁 Project Structure
 quizsmart/
  ├── index.html # Markup and layout
  ├── styles.css # All styles and responsive rules
  ├── script.js # Data loading, filtering, rendering, speech
  └── README.md # This file

## 🧠 How It Works
### Data flow
`
Google Sheet CSV
      │
      ▼
  fetch() ──► parseCSV() ──► allQuestions[]
                                   │
                                   ▼
                     filterQuestions() ──► filteredQuestions[]
                                   │
                                   ▼
                    (optional) shuffleArray()
                                   │
                                   ▼
                     renderQuestion() ──► DOM
`


## 🌐 Browser Support

| Browser | Support | Notes |
|---|---|---|
| Chrome (desktop & Android) | ✅ Full | Best TTS voice availability |
| Edge | ✅ Full | Excellent neural voices built in |
| Safari (macOS & iOS) | ✅ Full | iOS requires a user gesture before speech — clicking **Read** counts |
| Firefox | ✅ Full | Voice quality varies by OS |
| Samsung Internet | ✅ Full | Chromium-based |

**Notes:**

- The Web Speech API is supported in all modern browsers. Older browsers (IE11) are not supported.
- On iOS Safari, `speechSynthesis` must be triggered by a direct user interaction (tap). The **Read** button satisfies this requirement.
- Voice selection is automatic — the browser picks the best `en-US` voice available on the system.

## 🛠 Troubleshooting

### "Could not load quiz data"

- Confirm the CSV URL is still published (**File → Share → Publish to web**)
- Append `&v=2` to the URL to bypass Google's cache after header changes
- Open DevTools → Network tab and verify the CSV request returns 200
- The app will fall back to sample data, so the UI will still render

### Badge shows "QUESTION" instead of the real type

- The header in your CSV may be spelled differently
- `getField()` is tolerant of `Question_Type`, `Question Type`, `question_type`, etc.
- Run `console.log(allQuestions[0])` in the console to see the exact keys

### Speech doesn't play on Safari / iOS

- Speech must be triggered by a direct user tap — clicking **Read** satisfies this
- Make sure the device is not on silent mode
- Try a different voice via system settings if the default sounds robotic

### Dropdowns are empty

- Check that `Bible_Verse` values contain a `chapter:verse` pattern (e.g., `John 3:16`)
- Values without digits followed by a colon will not be parsed

### Questions out of order after adding new rows

- The app preserves CSV row order as-is. If your Google Form reorders rows, sort the sheet by `Question_ID` before publishing.

---

## 🤝 Contributing

This is a small personal project, but contributions are welcome:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-idea`)
3. Commit your changes
4. Push and open a Pull Request

Please keep the code dependency-free and mobile-friendly.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Acknowledgements



