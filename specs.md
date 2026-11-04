# Project Brief: Student-Centric Financial Tracker ("How Many Times" Budgeting App)

## Overview
A modern, lightweight web-based financial tracking application specifically tailored for students and young adults. The core philosophy of this app is reframing traditional budgeting—instead of just showing raw dollar amounts, it translates finances into **"how many times"** you can afford to do things (e.g., "You have 4 coffees or 1 movie night left in your entertainment budget this month").

---

## Core Features & Requirements

### 1. CSV Statement Import & Parsing
- **Input:** Allow users to upload or paste a standard bank/credit card CSV statement (supporting common columns like Date, Description, Amount, Category).
- **Processing:** Parse the CSV locally in the browser. Allow basic column-mapping or auto-detect standard headers.
- **Statement Breakdown:** Aggregate transactions by month and categorize them (e.g., Food & Dining, Transport, Entertainment, Shopping, Utilities).
- **Visualization:** Provide a clean monthly summary view showing spending totals and category breakdowns per billing statement cycle.

### 2. "How Many Times" Goal Trackers
- **Concept:** Traditional budgets tell you "$50 left." This app translates that remaining budget into tangible items/experiences based on a custom unit cost (e.g., a $5 latte, a $15 meal out, a $10 movie ticket).
- **Default Trackers to Include:**
  - Eating Out / Restaurants (unit cost default: $15)
  - Coffee / Boba (unit cost default: $5)
  - Entertainment / Fun (unit cost default: $20)
- **Dynamic Calculation:** As spending transactions are imported or logged, automatically subtract from the active trackers and show how many "items" or "times" the user has left in real-time.
- **Custom Tracker Creator:** Allow users to create custom trackers with:
  - Tracker Name (e.g., "Boba Runs", "Thrift Store Trips")
  - Monthly Budget Limit (in dollars)
  - Cost Per Item (unit price)
  - Icon or color tag for visual appeal

### 3. UI/UX & Design Guidelines
- **Target Audience:** Gen Z / College students. The aesthetic should be vibrant, clean, friendly, gamified, and modern (think Notion meets Copilot/Monzo, but simpler and playful).
- **Design System:** Use Tailwind CSS for rapid styling, with soft pastels, friendly typography, dark/light mode toggle, and smooth micro-interactions (e.g., progress bars filling up, celebratory counters when staying under budget).
- **Responsiveness:** Fully mobile-responsive since students will check this on their phones.