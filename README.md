# 📚 Study Dashboard – Personal Productivity Tool

A lightweight, self‑hosted study dashboard designed to help learners track their exam preparation, daily study hours, weekly goals, notes, and events – all in one place.

> **Built for personal use** – I created this tool because I needed a simple, offline‑first way to manage my own study sessions. It is not a commercial product, but a practical solution to a real need.

---

## 🧠 Why This Project?

As an AI researcher and developer, I spend a lot of time learning new concepts. I wanted a tool that:

- Works entirely **offline** (no cloud dependency)
- Runs as a **Chrome extension** (always one click away)
- Can also be installed as a **Progressive Web App (PWA)** on mobile
- Stores data **locally** (no server, no database)
- Provides **insights** like weekly progress, study streaks, and goal tracking

This project is the result of that need. It is built with **vanilla HTML/CSS/JavaScript** and uses **AI assistance** (like many modern tools) to speed up development – but every line of code is reviewed and tailored to my specific workflow.

---

## ✨ Features

- ⏱ **Focus Timer** – Stopwatch and countdown modes, with quick presets (5, 15, 25, 45, 60 min)
- 📚 **Subject & Topic Manager** – Add subjects, break them into subtopics, and track completion percentage
- 📊 **Study Statistics** – Daily, weekly, monthly, and yearly study hours
- 🎯 **Weekly Goal Setting** – Define a target study hours per week and visualise progress with a circular chart
- 📈 **Progress Charts** – Goal achievement gauge + 7‑day trend chart (canvas‑based)
- 📅 **Persian Calendar** – Full Shamsi (Jalali) calendar with event countdowns (down to the second)
- 📝 **Notes** – Save and edit notes with titles and timestamps
- 💾 **Backup & Restore** – Export/import all data as a JSON file
- 📱 **PWA Ready** – Can be installed on mobile devices as a standalone app
- 🔒 **Privacy First** – All data stays in your browser (localStorage / chrome.storage.local)

---

## 🛠️ Technologies Used

- **JavaScript (ES6)** – Core logic
- **HTML5 / CSS3** – UI with dark theme and responsive design
- **Canvas API** – Charts and progress visualisation
- **localStorage / chrome.storage.local** – Data persistence
- **Service Worker** – PWA offline support
- **Google Chrome Extensions API** – For the browser extension version

---

## 🚀 Installation & Usage

### As a Chrome Extension (Desktop)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the project folder.
5. The extension icon will appear in your toolbar. Click it to open the dashboard.

---

## 🖼️ Screenshots

*(Add your own screenshots here if you like – you can include them in the repository and link them.)*

---

## 📁 Project Structure
study-dashboard/
├── dashboard.html # Main application page
├── dashboard.js # All logic (timer, subjects, charts, backup, etc.)
├── manifest.json # PWA manifest (for mobile installation)
├── icon-192.png # PWA icon (192px)
├── icon-512.png # PWA icon (512px)
├── icon16.png # Chrome extension icon (16px)
├── icon48.png # Chrome extension icon (48px)
├── icon128.png # Chrome extension icon (128px)
├── background.js # Chrome extension background service worker
└── README.md # This file


---

## 🤖 AI Assistance

This project was developed with the help of AI‑powered code generation tools.  
However, **every feature was designed, reviewed, and validated** by me to ensure it meets my actual needs and follows best practices.

I believe that using AI as a productivity accelerator is a skill in itself – and this project reflects that mindset.

---

## 📄 License

This project is open‑source and available under the [MIT License](LICENSE).  
Feel free to use, modify, and adapt it for your own learning journey.

---

## 🙌 Feedback & Contributions

Since this is a personal tool, I am not actively seeking contributions, but if you find it useful or have suggestions, feel free to open an issue or reach out.

---

**Made with ❤️ for personal productivity – and a little help from AI.**
