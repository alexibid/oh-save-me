# 🚀 Minimum Viable Product (MVP) - Oh Save Me!

**MVP Version:** 0.1.0  
**Status:** Shipped — Web live, Desktop and Android installers available  
**Architecture:** Local-First / Zero-Server  

---

## 📄 1. Mission: The Anti-Spreadsheet Personal Assistant

The core goal of Oh Save Me! MVP v0.1.0 is to deliver an **intelligent, privacy-first personal assistant** that frees users from spreadsheet management and tedious financial administration.

Instead of requiring manual data entry or complex grid filtering, the Assistant handles heavy-lifting tasks behind the scenes — automatically inferring bank statement structures, categorizing expenses, detecting internal transfers, and calculating budget ceilings — so the user simply reviews and approves.

### How the Assistant Learns (Non-Technical Explanation)
The Assistant works like an intuitive digital memory. Every time you import a statement or correct a category, the Assistant observes the merchant names and remembers your preference. On future imports, it automatically applies these learned rules to predict categories and map bank files — getting smarter with every use, without ever sending your financial data to the cloud.

---

## 1. Importing Statements & Setting Up Accounts
As a user, I drop my bank's CSV or OFX file, and:
* The app recognizes CGD, Millennium BCP, Bankinter, Cartão Universo, and other common Portuguese banks automatically — no manual setup.
* Even for a bank it doesn't already recognize, it reads the file's content and proposes the right structure for me to confirm.
* Any correction I make is remembered privately for next time.
* My account's name, type, and starting balance are pre-filled from the statement.
* I have one single "add" button for anything — a new account, an imported file, or a manual entry.
* Duplicate transactions from overlapping imports are caught automatically.
* Before anything is saved, I review a screen with suggested categories and budgets, and can accept the confident ones in one click.
* My investment and fund transactions are recognized and categorized automatically.

---

## 2. Categorizing Without Doing It Myself
* Categorization happens automatically, on-device, in milliseconds — none of this data ever leaves my device.
* I pick categories from one consistent selector everywhere in the app, and can create new ones inline.
* Common Portuguese merchants are already categorized correctly; my own corrections always take priority.
* When I recategorize one transaction, the app offers to fix every similar one in my history at once.

---

## 3. Getting Direct Answers on My Dashboard
* Summary cards give me direct answers instead of tables, and I can tap into any category for detail.
* I can select several transactions and instantly see their total, average, and net.

---

## 4. Budgets Without a Spreadsheet
* One general budget tracks my everyday living expenses.
* I can set up separate project budgets for specific goals (a new EV charger, a vacation, renovations), with their own start and end.
* Anything I assign to a project budget doesn't count against my everyday budget.
* The app suggests a sensible ceiling for each category from my last 6 months of habits.
* Closing a finished project automatically returns any unspent money to my everyday budget.

---

## 5. Transfers Between My Own Accounts
* The app recognizes when I move money between my own accounts, and I can link or unlink these manually too.
* These transfers never inflate my income or expense totals.
* I always see one combined balance across all my active accounts.

---

## 6. My Daily Cash-Flow at a Glance
* A simple chart shows daily income vs. expenses.
* I can overlay my project budgets on it to see exactly when extra spending happened.
* I can view it by month, quarter, year-to-date, or any custom range.

---

## 7. Investments & Retirement, Kept Separate
* My broker account shows the real cash I have available, separate from unrealized market gains/losses.
* My retirement savings have their own dedicated view, separate from day-to-day spending.

---

## 8. Keeping My Data Safe
* I can see how much storage my data uses, back it up as an encrypted file, restore it, and check a history log of changes — no technical knowledge needed.
* A private sync option (via my own Google Drive) is visible in the app, though the real connection isn't built yet — see `PRD.md` §5.

---

## 9. Speaking My Language
* The entire app is in natural European Portuguese — financial terms, dates, and currency — not translated banking jargon.

---

Roadmap and future ideas live exclusively in `PRD.md` §5 (Roadmap & Ideas) — not duplicated here.
