# SafeFood AI (AI-FSR) 🛡️
### Intelligent Food Safety Compliance & Predictive Recall Platform

[![FSSAI Compliance](https://img.shields.io/badge/FSSAI-2026%20Ready-success?style=for-the-badge&logo=shield)](https://github.com/naveen-kumar-agraharam/AI-FSR)
[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20CSS3%20%7C%20HTML5-blue?style=for-the-badge)](https://github.com/naveen-kumar-agraharam/AI-FSR)
[![Chart.js](https://img.shields.io/badge/Data%20Viz-Chart.js-orange?style=for-the-badge&logo=chartdotjs)](https://github.com/naveen-kumar-agraharam/AI-FSR)
[![Voice AI](https://img.shields.io/badge/Speech%20AI-Web%20Speech%20API-purple?style=for-the-badge&logo=soundcharts)](https://github.com/naveen-kumar-agraharam/AI-FSR)

---

## 📌 Overview

**SafeFood AI (AI-FSR)** is an enterprise-grade food safety intelligence platform designed to automate regulatory compliance, evaluate standard operating procedures (SOPs), audit product labeling against national food safety authorities (such as FSSAI), and predict batch recall risks before contamination reaches consumers.

Featuring an interactive modern dashboard with real-time risk indicators, automated audit assistants, and multilingual voice capabilities, SafeFood AI streamlines end-to-end quality assurance for food processors, distributors, QA teams, and regulatory auditors.

---

## ✨ Core Features & Modules

### 1. 📊 Executive Overview & Compliance Health Index
* **Enterprise Health Score**: Dynamic radial compliance rating tracking overall facility readiness.
* **Live Status Feed**: Continuous sync monitoring for regulatory standards and supplier alerts.
* **Notification Center**: Real-time alerts for contamination risks, critical vendor deviations, and SOP audit completions.

### 2. ⚖️ FSSAI Regulatory Assistant
* **AI Compliance Chatbot**: Real-time Q&A engine trained on FSSAI guidelines, licensing tiers, shelf-life norms, and packaging mandates.
* **Instant Query Chips**: One-click quick prompts for dairy shelf-life, distributor licensing, allergen rules, and packaging criteria.
* **Audit Checklist Generator**: Generates customized inspection checklists for specific facility types (dairy, confectionery, meat processing, etc.).

### 3. 📄 Document Intelligence (SOP & HACCP Auditor)
* **Automated SOP & HACCP Review**: Scans uploaded or pasted procedures against FSSAI critical control point (CCP) benchmarks.
* **Gap Analysis**: Detects missing hygiene protocols, undocumented temperature logs, and pest control omissions.
* **Remediation Recommendations**: Generates immediate corrective action steps to address compliance gaps.

### 4. 🏷️ Food Label & Packaging Validator
* **Nutritional & Ingredient Auditing**: Verifies macronutrient breakdowns, sodium, added sugars, and trans fats.
* **Allergen Detection**: Flags undeclared allergens (gluten, peanuts, soy, dairy, sulfites) and enforces bolding/warning requirements.
* **Mandatory Declarations Check**: Confirms Veg/Non-Veg logo compliance, batch numbers, expiry formats, and manufacturer details.

### 5. ⚠️ Predictive Recall Dashboard
* **Supplier Risk Scoring**: Machine-learning driven supplier assessment matrix highlighting high-risk raw material vendors.
* **Interactive Data Visualizations**: Rich Chart.js analytics for historical contamination trends, pathogen risks (Salmonella, E. coli, Listeria), and risk distribution.
* **Batch Traceability**: Pinpoints affected batches with automated quarantine workflow triggers.

### 6. 🎙️ Multilingual Voice Agent
* **Hands-Free Operation**: Voice-driven audit interface tailored for factory floors and lab environments.
* **Multilingual Speech Support**: Real-time speech recognition and speech synthesis in **English**, **Hindi (हिंदी)**, and **Tamil (தமிழ்)**.
* **Interactive Voice Commands**: Query compliance statuses, trigger label scans, or ask safety guidelines completely hands-free.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, Semantic Elements | Accessible and responsive UI layout |
| **Styling** | Vanilla CSS3 | Custom design system, CSS variables, glassmorphism, responsive grid |
| **Scripting & Logic**| Vanilla JavaScript (ES6+) | Tab routing, state management, simulated AI inference, DOM updates |
| **Data Visualization**| [Chart.js](https://www.chartjs.org/) | Responsive charts for risk indices, supplier ratings, and recall metrics |
| **Typography** | Google Fonts ([Outfit](https://fonts.google.com/specimen/Outfit) & [Inter](https://fonts.google.com/specimen/Inter)) | Clean enterprise typography |
| **Iconography** | [FontAwesome 6](https://fontawesome.com/) | Comprehensive vector icons |
| **Speech Engine** | Web Speech API (`webkitSpeechRecognition` & `SpeechSynthesis`) | Browser-native multilingual speech recognition and text-to-speech |

---

## 📁 Repository Structure

```plaintext
AI-FSR/
├── index.html      # Main application interface with modular tab views
├── style.css       # Complete design system, dark glassmorphic styling, and animations
├── app.js          # Core business logic, Chart.js integrations, voice agent, and datasets
└── README.md       # Project documentation and guide
```

---

## 🚀 Quick Start Guide

### Prerequisites
SafeFood AI is built with zero runtime dependencies. All you need is a modern web browser (Google Chrome or Microsoft Edge recommended for full Web Speech API compatibility).

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/naveen-kumar-agraharam/AI-FSR.git
   cd AI-FSR
   ```

2. **Launch the application:**
   * **Option A: Direct Browser Opening**
     Simply double-click `index.html` or open it with any web browser.

   * **Option B: Using VS Code Live Server**
     Right-click `index.html` in VS Code and select **"Open with Live Server"**.

   * **Option C: Using Python HTTP Server**
     ```bash
     python -m http.server 3000
     ```
     Then open `http://localhost:3000` in your browser.

   * **Option D: Using Node.js `npx serve`**
     ```bash
     npx serve .
     ```

---

## 💡 Usage Highlights

1. **Navigating Modules**: Use the left sidebar to navigate between **Overview**, **Regulatory Assistant**, **Document Intelligence**, **Label Validator**, **Recall Prediction**, and **Voice Agent**.
2. **Interactive Regulatory Chat**: Click on any of the suggested prompt chips or type your own question to receive tailored FSSAI compliance answers.
3. **Running a Label Audit**: Switch to the **Label Validator** tab, select a sample food product or paste nutritional information, and click **Validate Label** to view the compliance score and flagged violations.
4. **Hands-free Voice Agent**: Open the **Voice Agent** tab, pick your preferred language (English, Hindi, or Tamil), click the microphone button, and speak your compliance query.

---

## 🔒 Security & Privacy

* SafeFood AI operates directly in the browser environment without transmitting proprietary recipes or facility blueprints to external untrusted servers.
* Web Speech API requests rely on standard browser speech services.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Developed with passion for food safety and regulatory compliance.*
