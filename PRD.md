# 📄 Product Requirement Document (PRD)

**Product Name:** Oh Save Me!  
**Version:** 1.0.0  
**Target Platforms:** Web, macOS, Windows, Android (shipping today), iOS (in progress)  
**Core Tech Stack:** Angular 19, RxDB, Angular Material, Tauri v2, Capacitor  

---

## 1. Executive Summary & Mission: The Anti-Spreadsheet Personal Assistant

### 1.1. Product Mission
**Oh Save Me!** is an intelligent personal financial assistant built to free everyday people from the burden of tedious, time-consuming financial management. Most traditional finance applications act as passive history logs or complex spreadsheets that force users to manually enter, categorize, and calculate data. Oh Save Me! inverts this paradigm: it acts as a **proactive decision assistant** that eliminates manual spreadsheet chores and directly answers the user's real-world questions — *"How much can I safely spend today without compromising this month's goals?"* — while guaranteeing **100% absolute privacy (Local-First / Zero-Server)**.

### 1.2. Target User & Persona ("Anti-Spreadsheet")
Oh Save Me! is designed for **financial laypeople**, not spreadsheet power users. The target user manages a household budget and values time, clarity, and simplicity over complex BI tools. Every feature decision must pass this test: *does it deliver an immediate, direct answer from an intelligent assistant, or does it hand the user a spreadsheet to figure out themselves?* If it requires manual friction, the Assistant must intervene to automate it.

### 1.3. Anti-Table / Verification-First Presentation
Dense transaction grids and spreadsheet tables are treated as a **last resort**, reserved only for audit or export modes. The primary interface relies on direct answer cards, batch review screens, and inline confirm/correct controls where the Assistant does the heavy lifting and the user simply approves.

### 1.4. How the Assistant Learns (Non-Technical Explanation of On-Device ML)
To act as a true assistant without compromising privacy, Oh Save Me! runs a lightweight **on-device Machine Learning engine**.

* **In simple terms:** The Assistant operates like an intuitive digital memory that lives entirely inside your device. Every time you import a bank statement or correct a category, the Assistant observes the text patterns (like merchant names) and remembers your preferences. On the next import, it applies this experience to automatically categorize transactions and map bank files — getting smarter with every use.
* **100% Private & Instant:** Because this engine runs locally on your device, zero financial data ever leaves it or touches an external server. It works offline, instantly, and at zero extra cost.

---

## 2. Strategic Differentiators

1. **Intelligent On-Device Assistant:** Automates column mappings, merchant categorization, transfer links, and budget suggestions, turning tedious financial admin into effortless 1-click approvals.
2. **Zero-Access Privacy (Local-First):** No bank credentials, passwords, or financial data ever leave the local device. All data resides in an encrypted local database.
3. **Personal Cloud Sync (Google Drive)** *(in development, see §5)*: Multi-device synchronization operates privately via the user's own Google Drive, ensuring full ownership without third-party servers.
4. **Flexible Transaction Splitting** *(in development, see §5)*: Allows splitting a single bank movement (e.g., a $150 supermarket receipt) into distinct categories, tags, and custom notes.
5. **Proactive Behavioral Guidance:** The Assistant actively watches for spending gaps and prompts the user with direct, actionable suggestions — e.g., detecting vacation spending patterns and asking *"Detected vacation expenses — set up a Vacation budget?"* with a one-tap action.

---

## 3. System Architecture & Tech Stack

| Layer | Technology | Function / Description |
| :--- | :--- | :--- |
| **Frontend Core** | Angular 19 (SPA) | Reactive UI, state management (Signals/RxJS), and interactive charts. |
| **UI Design System** | Angular Material | Native Material components as the sole source of atoms — no custom kits. |
| **Local Database** | RxDB (Reactive DB) | Offline-first, reactive JSON document database. |
| **On-Device Assistant ML** | Pure TypeScript | Lightweight local classifier for category and column predictions (100% local, <10 KB). |
| **Cloud Sync** | Google Drive REST API | Encrypted backup and sync using the user's own Google Drive. **Not implemented yet** — today it only simulates syncing, see §5. |
| **Desktop Wrapper** | Tauri v2 | macOS, Windows, Linux wrapper. **Shipping today.** |
| **Mobile Wrapper** | Capacitor v6 | Android **shipping today**; iOS still in progress, see §5. |

---

## 4. Functional Requirements — User Stories

### 4.1. Importing Bank Statements & Setting Up Accounts
* **FR-01:** As a user, I can import my bank statement as a CSV or OFX file, exactly as my bank exports it.
* **FR-02:** As a user, if my bank is one of the common Portuguese banks, the app already knows how to read its file — I don't map any columns myself.
* **FR-03:** As a user, even with a bank the app doesn't already recognize, it looks at the file's content and proposes the right columns for me to confirm.
* **FR-04:** As a user, any correction I make to a column mapping is remembered privately, so I never have to repeat it for that bank again.
* **FR-05:** As a user, the app suggests my account's name, type, and starting balance from the statement — I just confirm it.
* **FR-06:** As a user, if I accidentally import overlapping statements, the app quietly skips the transactions I already have, so nothing is duplicated.
* **FR-07:** As a user, before anything is saved, I see a review screen with the app's suggested category and budget for each transaction, so I can catch mistakes.
* **FR-08:** As a user, I can accept everything I'm confident about in one click, and come back later to the few items the app wasn't sure about.

### 4.2. Categorizing & Learning From Me
* **FR-09:** As a user, I can create, edit, and reorganize my own categories, and my past transactions move along automatically.
* **FR-10 (Not Started):** As a user, I want to split one purchase (like a supermarket receipt) across several categories, so my spending totals stay accurate. *(Already designed, not yet built.)*
* **FR-11:** As a user, I can add a free-text note or a custom tag (like `#Vacation2026`) to any transaction.
* **FR-12:** As a user, common Portuguese merchants (supermarkets, fuel, utilities) are already categorized correctly out of the box.
* **FR-13:** As a user, while importing, the app already guesses a category for each new transaction based on what I've done before.
* **FR-14:** As a user, when I recategorize one transaction, the app offers to fix every similar transaction in my history at once, so I don't repeat the same correction over and over.
* **FR-15:** As a user, the app gets better at guessing my categories every time I confirm or correct one.
* **FR-16:** As a user, my investment and fund transactions are automatically categorized and kept separate from everyday spending.

### 4.3. Budgeting Without Spreadsheets
* **FR-17:** As a user, I have one general budget that tracks my everyday living expenses.
* **FR-18:** As a user, I can set up a separate budget for a specific goal or project (like a new car, a vacation, or renovations), with its own start and end.
* **FR-19:** As a user, anything I assign to a project budget doesn't count against my everyday budget, so a big one-off expense doesn't make it look like I overspent this month.
* **FR-20:** As a user, when I close a finished project, whatever money is left over automatically goes back into my everyday budget.
* **FR-21:** As a user, the app suggests a sensible budget ceiling for each category based on my last 6 months of spending, so I don't have to guess a number myself.

### 4.4. Transfers Between My Own Accounts
* **FR-22:** As a user, the app automatically recognizes when I move money between my own accounts, and I can also link or unlink these manually.
* **FR-23:** As a user, transfers between my own accounts are never counted as income or spending, so my totals stay accurate.
* **FR-24:** As a user, I always see one combined balance across all my active accounts, updated in real time.

### 4.5. Getting Direct Answers Instead of Tables
* **FR-25:** As a user, I get a clear at-a-glance summary of income, expenses, and what's left.
* **FR-26:** As a user, I can see a simple chart of my daily spending vs. income, over any period I choose (month, quarter, year, custom).
* **FR-27:** As a user, I can overlay my project budgets on that chart, to see exactly when extra spending happened.
* **FR-28:** As a user, I can select several transactions and instantly see their total, average, and net — without opening a spreadsheet.

### 4.6. Investments & Retirement, Kept Separate
* **FR-29:** As a user, my investment account shows the cash I actually have available, kept separate from unrealized market gains/losses, so market swings don't distort my daily numbers.
* **FR-30:** As a user, my retirement savings have their own dedicated view, tracked apart from day-to-day spending.

### 4.7. Keeping My Data Safe
* **FR-31:** As a user, I can see how much storage my data uses, back it up as an encrypted file, restore it, and check a history log of changes — all without any technical knowledge.

### 4.8. Speaking My Language
* **FR-32:** As a user, the entire app is in natural European Portuguese, including financial terms, dates, and currency — not translated banking jargon.

### 4.9. Getting the App Onto My Device
* **RELEASE-001:** As a user, I can already use Oh Save Me! on the Web, and install it as a native app on macOS, Windows, and Android — a properly signed iOS version is still in progress.
* **RELEASE-002:** As a user, every new version is published as a downloadable release, so I always know where to get the latest installer.

---

## 5. Roadmap & Ideas

**Legend:** ✅ Done · 🔜 To Do (committed) · 🔬 Under Study (idea being evaluated, not committed) · ❌ Rejected (evaluated and dropped)

* 🔜 **FR-10:** As a user, when one purchase actually covers more than one thing — like a supermarket receipt that includes both groceries and a pharmacy item — I want to split it into the right categories instead of it all landing in one bucket, so my category totals and budgets stay accurate. Already designed, not yet built.
* 🔜 **FR-33:** As a user, I want the app to feel as good on my phone as it does anywhere else, with a more polished, mobile-first interface — rolling out page by page, not a single rewrite. **Current top priority.** Also fixes an inconsistent app name style, and a sync status card that currently claims a "last synced" time even though real sync doesn't exist yet.
* 🔜 **FR-34:** As a user, I want to see and correct the category rules the Assistant has learned from me, so I understand why something got categorized a certain way and can fix it directly instead of only fixing one transaction at a time.
* 🔬 **FR-35:** As a user, I want my data to actually sync across my devices through my own Google Drive, so starting on my phone and continuing on my laptop just works — today the sync status shown is entirely simulated, nothing is really uploaded or downloaded.
* 🔬 **FR-36:** As a user, I want to install Oh Save Me! on my iPhone the normal way, from a real release — today the iOS build only exists for internal verification, and a real one depends on enrolling in Apple's paid developer program first.
* 🔬 **FR-37:** As a user who manages finances together with family, I want to merge another member's data into mine, with anything we both already entered caught automatically and an easy way to undo it, so we get one shared picture instead of two conflicting ones.
* 🔬 **FR-38:** As a user, I want to paste something I copied — a table from a website, or a statement from another app — straight into Oh Save Me! and have it mapped to the right fields, without first having to save it as a file.
* 🔬 **FR-39:** As a visitor who doesn't know Oh Save Me! yet, I want to find genuinely useful articles about household savings and organization, so I discover the app naturally instead of through paid ads.
* 🔬 **FR-40:** As a user, I want to anonymously see and share what other people paid for common items, so I know whether I'm getting a good price.
* 🔬 **FR-41:** As a user, I want the Assistant to notice when my spending pattern changes — like a burst of vacation expenses — and proactively suggest setting up a budget for it, instead of waiting for me to think of it myself.
* 🔬 **FR-42:** As a user, I want one single number on my dashboard telling me how much I can safely spend today without hurting this month's goals — the exact question the app is meant to answer (see §1.1), which today I still have to piece together myself.
* 🔬 **FR-43:** An idea spotted during design work, not yet defined as a proper story — needs clarifying whether it means the same thing as merging family data (FR-37) or something different, like a shareable report or export.

* ❌ *(nothing rejected so far — category stays ready for when something is)*
