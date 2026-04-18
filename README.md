# 🌸 ManaScreen

**A warm, private mental wellness screening tool for patients in India.**

ManaScreen helps people assess their mental health (depression + anxiety) through validated clinical tools (PHQ-9 and GAD-7), guided calming exercises, and a helpful FAQ — before their first appointment with a specialist.

---

## ✨ Features

- 🌿 **PHQ-9 & GAD-7 screening** — clinically validated, conversational, one question at a time
- 🧘 **7 calming exercises** — Box Breathing, 4-7-8 Breathing, 5-4-3-2-1 Grounding, Body Scan, Progressive Muscle Relaxation, Gratitude, Self-Compassion
- 💬 **Smart FAQ** — 10 personalised Q&As based on the patient's actual scores
- 📚 **Learn section** — psychoeducation on depression, anxiety, self-care, and more
- 💙 **Crisis safety** — helpline numbers always visible for high-risk scores
- 🔒 **No data stored** — completely private, nothing saved or shared
- 📱 **Mobile-first** — works beautifully on any phone browser

---

## 🚀 Deploy in 2 minutes (Free)

### Option 1 — Vercel (Recommended)

1. Fork or clone this repo
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"Add New Project"** → select this repo
4. Leave all settings as default → click **Deploy**
5. ✅ You'll get a live link like `manascreen.vercel.app`

### Option 2 — Netlify

1. Go to [netlify.com](https://netlify.com) → **"Add new site" → "Import from Git"**
2. Select this repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy** ✅

---

## 💻 Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project structure

```
manascreen/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx        ← Main application
│   └── main.jsx       ← React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## ⚠️ Disclaimer

ManaScreen is a wellness screening tool, not a clinical diagnostic instrument. Results should always be discussed with a qualified mental health professional. This tool does not store any user data.

---

## 📞 Crisis Resources (India)

- **iCall (TISS):** 9152987821
- **Vandrevala Foundation (24/7):** 1860-2662-345
- **NIMHANS:** 080-46110007
- **Snehi:** 044-24640050

---

*Built with React + Vite. Designed with care for patients in India.*
