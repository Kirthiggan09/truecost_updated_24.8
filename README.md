# TrueCost 🚗💰
[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-blue?style=for-the-badge)](https://borneo-2.vercel.app/)

**TrueCost** is a comprehensive car affordability **"reality check"** platform built to help Malaysians understand the *true* cost of owning a vehicle beyond the sticker price.

Instead of focusing only on monthly installments, TrueCost analyzes the **full ownership burden** including:

* Loan repayments
* Fuel costs
* Insurance
* Road tax
* Maintenance
* Depreciation
* Opportunity cost

Built for **BorNEO HackWknd**, TrueCost aims to reduce financial misinformation in Malaysia’s automotive ecosystem and encourage smarter long-term financial decisions.

---

# 🏆 BorNEO HackWknd Project

TrueCost was developed as part of **BorNEO HackWknd 2026**, focusing on solving real-world financial challenges faced by young Malaysians and first-time car buyers.

### 🎯 Problem Statement

Many Malaysians evaluate cars based only on:

* Monthly installment
* Dealer promotions
* Loan approval amount

This creates:

* High debt burdens
* Poor financial planning
* Long-term wealth erosion

TrueCost addresses this by transforming hidden ownership costs into clear, understandable financial insights.

---

# 🆕 What's New in V2

TrueCost V2 is a major evolution from a basic affordability calculator into a **cinematic financial decision platform**.

## 🎬 Cinematic User Experience

* Auto-play storytelling landing page
* Sequential text reveals
* Emotional “Dealer vs Reality” narrative
* Dynamic animations and cost shock visuals

---

## ⚙️ Advanced Cost Simulation

### 💳 Loan Customization

* Adjustable down payment slider
* 5 / 7 / 9-year loan tenure options
* Interest rate overrides
* Real-time affordability validation

### ⛽ Malaysian Fuel Subsidy Modeling

* RON95 subsidy simulation
* First 200L/month subsidized
* Excess usage charged at market rate
* Traffic and driving style multipliers

### 🛠️ Insurance & Maintenance Intelligence

* NCD discount modeling (0–55%)
* Authorized vs independent service center comparison
* Brand depreciation retention simulation

### 📍 Geographic Cost Reality

Parking and toll simulations based on:

* Free/Suburban
* Town/City
* KL/PJ
* KLCC

---

## 🔍 Transparency Features

New expandable:

### “How We Calculated This”

sections explain:

* Formulas used
* Data assumptions
* Calculation logic
* Cost breakdown methodology

This improves:

* Financial literacy
* User trust
* Transparency

---

## 🇲🇾 Malaysia-Native Financial Modeling

V2 introduces deeper Malaysian localization:

* PTPTN repayment support
* JPJ road tax references
* Malaysian fuel subsidy structure
* Malaysian used car depreciation behavior
* Geographic ownership cost simulation

---

# 🌟 Features

* **Car Database Integration**
  Browse and select cars with pre-loaded Malaysian vehicle data.

* **Financial Affordability Calculator**
  Calculate monthly commitments and evaluate affordability using financial safety benchmarks.

* **Complete Cost Breakdown**
  Visualizes:

  * Fuel
  * Maintenance
  * Road Tax
  * Insurance
  * Loan repayments
  * Depreciation

* **Interactive Scenario Modeling**
  Explore different:

  * Loan terms
  * Down payments
  * Interest rates
  * Ownership conditions

* **AI Financial Advisor**
  AI-powered assistant using Groq for:

  * Affordability analysis
  * Risk detection
  * Car recommendations
  * Financial coaching

* **Wealth Gap Analysis**
  Compare how expensive car decisions impact long-term savings and investment growth.

* **PDF Report Export**
  Generate downloadable affordability reports.

* **Cinematic UI**
  Responsive interface with animations, transitions, charts, and storytelling visuals.

---

# 🛠️ Tech Stack

* **Frontend**: Vanilla HTML, CSS, JavaScript
* **Backend**: Node.js with Express
* **Database**: Supabase
* **AI Engine**: Groq API
* **Deployment**: Vercel

---

# 🚀 Getting Started

## Prerequisites

* Node.js installed
* Supabase account
* Groq API access

---

## Installation

1. Clone or download the repository.

2. Navigate to the project directory:

```bash
cd TrueCost-main-main
```

3. Install dependencies:

```bash
npm install
```

---

## Configuration

Create a `.env` file in the root directory (`server.js` location):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_groq_model_name
```

---

## Running Locally

Start the development server:

```bash
node server.js
```

The application will run at:

```bash
http://localhost:3000
```

---

# 📁 Project Structure

```bash
TrueCost/
│
├── server.js              # Express backend server
├── api/                   # Serverless API functions
├── public/                # Frontend assets
│   ├── index.html
│   ├── css/
│   ├── js/
│   │   ├── ui.js
│   │   ├── finance.js
│   │   ├── ai.js
│   │   ├── pdf.js
│
├── package.json
└── .env
```

---

# 🧠 AI Implementation

TrueCost uses a **math-first AI architecture** to improve reliability and reduce hallucinations.

### Smart Recommendation Pipeline

* JavaScript filters affordable vehicles first
* AI evaluates lifestyle compatibility
* Top recommendations generated based on user finances

### AI Advisory Features

* Debt-to-income analysis
* Risk categorization
* Personalized recommendations
* Follow-up financial Q&A

---

# 🎯 Sustainable Development Goals (SDG)

* **SDG 1 – No Poverty**
  Helps users avoid debt traps.

* **SDG 8 – Decent Work & Economic Growth**
  Encourages responsible financial behavior.

* **SDG 10 – Reduced Inequalities**
  Provides free financial analysis tools accessible to everyone.

---

# 👥 Team Eliza

* **Risikesan S/o Yogeswaran**
* **Dakshina Narrayana S/o Selvavinayagam**
* **Kirthiggan S/o Saravanan**
* **Kavinnesh S/o R Chandraguptha**

---

# 📝 License

This project is licensed under the ISC License.

TrueCost is intended for educational and financial awareness purposes only.
Please consult certified financial professionals before making major financial commitments.
