# QuizSmart · Bible Quiz 📘

A lightweight, fully client-side Bible quiz web app that loads questions from a published Google Form (CSV), filters them by verse range, and reads them aloud using the browser's Web Speech API.

**Live demo:** `https://<your-username>.github.io/<your-repo-name>/`

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
