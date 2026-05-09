# 🚗 TrueCost — Car Affordability Reality Check

**TrueCost** is a high-performance financial intervention tool designed to help Malaysian car buyers look beyond the monthly installment. It calculates the **actual** monthly expense of vehicle ownership—including fuel, maintenance, insurance, and depreciation—while providing AI-driven advisory to ensure long-term financial health.

Developed for **BorNEO HackWknd**, TrueCost bridges the gap between "what you can borrow" and "what you can actually afford."

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-blue?style=for-the-badge)](https://borneo-2.vercel.app/)
[![Demo Video](https://img.shields.io/badge/🎥_Demo_Video-Watch-red?style=for-the-badge)](https://youtu.be/LG_GxtVKr9Q)

---

## 🎯 Sustainable Development Goals (SDG)

- **SDG 1 (No Poverty):** Prevents debt traps caused by unaffordable vehicle commitments.
- **SDG 8 (Decent Work & Economic Growth):** Encourages responsible financial behavior and long-term wealth building.
- **SDG 10 (Reduced Inequalities):** Provides free access to professional-grade financial modeling tools for all income levels.

---

## 🌟 Key Features

- **The "True Cost" Engine:** Breaks down ownership into six critical pillars: Loan Installment, Fuel, Insurance, Road Tax, Maintenance, and Depreciation.
- **Smart Affordability Assessment:** Uses a proprietary risk algorithm (Low, Caution, High Risk) based on salary, dependents, and job stability.
- **Wealth Gap Analysis:** An interactive visualization showing the "Opportunity Cost"—the wealth a user could accumulate over 5–10 years by choosing a more economical car and investing the difference.
- **AI Financial Advisor:** An integrated chat interface powered by **GPT-4o** (via OpenAI) that provides personalized vehicle recommendations and debt-to-income analysis.
- **Comprehensive Vehicle Database:** Includes a pre-loaded dataset of **919 Malaysian vehicles** with real-world pricing and specifications.

---

## 🛠️ Technical Stack

TrueCost was engineered as a zero-latency, single-page application (SPA) with no external framework dependencies.

- **Frontend:** Pure HTML5, CSS3, and Vanilla JavaScript (ES6+).
- **AI Inference:** OpenAI API using the `gpt-4o-mini` model.
- **Data Visualization:** Custom-built SVG charting engine for programmatic line and bar charts.
- **Typography:** Playfair Display (Serif) & IBM Plex Mono for a premium "Financial Journal" aesthetic.

---

## 📊 Methodology

### 1. The Affordability Formula

The system evaluates safety using several financial benchmarks:

- **The 20/3/8 Rule:** 20% downpayment, max 3-year loan, max 8% of salary.
- **DSR (Debt Service Ratio):** Analyzing how the new car affects the user's total debt-to-income ratio.

### 2. Wealth Gap Calculation

$$Total Savings = (Cost_A - Cost_B) \times \frac{(1 + r)^n - 1}{r}$$

_Where $r$ is the annual investment return (benchmarked at 6% for EPF/ASB)._

---

## 🚀 Getting Started

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/truecost.git

```

2. **API Configuration:**
   Create a `.env` file in the root directory (one has been created for you) and add your OpenAI API key:

```env
GROQ_API_KEY=your_openai_api_key_here
GROQ_MODEL=gpt-4o-mini
```

3. **Run Locally:**
   Since the app uses serverless functions for API security, use the Vercel CLI to run it locally:

```bash
npm install -g vercel
vercel dev
```

Then open `http://localhost:3000` in your browser.

---

## 🧠 AI Implementation

TrueCost integrates advanced AI to transform raw financial data into personalized coaching.

The application utilizes the **OpenAI API** powered by the `gpt-4o-mini` model. To ensure accuracy and eliminate "hallucinations," the system uses a **math-first architecture**:

- **Smart Recommendation:** Instead of searching the entire 919-car database via AI, the system uses a deterministic JavaScript filter to find cars within **1.5x of the user’s safe budget**. This filtered list is then passed to the AI to select the top 3 best lifestyle matches.
- **Context-Aware Advisory:** The AI receives the user's specific financial profile (salary, DTI, dependents) and generates a structured verdict, risk assessment, and safer alternatives.
- **Interactive Advisor:** A rolling **8-message context window** allows users to ask follow-up questions about their specific results in real-time.

### **2. AI-Assisted Development**

The team leveraged **Claude (Anthropic)** during the engineering phase for:

- **Formula Validation:** Perfecting the compound interest models for the Wealth Gap analysis.
- **SVG Engineering:** Developing the custom programmatic logic for dynamic chart rendering.
- **Prompt Engineering:** Designing system instructions that adapt the AI's tone based on the user's risk level (e.g., providing more cautious advice for high-risk profiles).

---

## 👥 Team Eliza

- **Risikesan S/o Yogeswaran**
- **Dakshina Narrayana S/o Selvavinayagam**
- **Kirthiggan S/o Saravanan**
- **Kavinnesh S/o R Chandraguptha**

---

## 🛡️ License

This project was developed for hackathon purposes. Please consult a certified financial planner for actual investment advice.
