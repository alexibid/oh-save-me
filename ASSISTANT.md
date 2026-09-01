# 🧭 Oh Save Me! — Questions the app answers

This document lists the questions the user asks, and records which are already answered and
approved. It is not a technical plan — it is the contract between what the user wants to know
and what the app tells them.

> **How to read it:** a question only counts as closed when both columns are green.
> **Implemented** is the engine that computes and delivers the card. **Approved** is the user
> answering, after seeing the result with real data. Implemented without approved is worth
> nothing — an insight has compiled, passed its tests, and shown an absurd number in production
> more than once.

---

## The two channels

The app answers through two routes, and they never mix.

**💡 Insight (Dashboard).** Answers money questions through **charts, metrics, and lists**. It is
silent analysis. The user looks and understands. It asks for nothing in return.

**🛠️ Assistant (FAB / intervention).** Handles administrative hygiene and, above all, **asks what
it cannot decide on its own**. It is the channel for doubt and action.

### The confidence criterion

This is the rule that decides which channel something lives in:

| Confidence | What the app does |
| :--- | :--- |
| **100%** | Does it silently. Does not interrupt. |
| **~50% — the grey zone** | **Asks the user.** This is why the assistant exists. |
| **Below the prior** | Stays quiet. Not enough signal to be worth asking. |

What this means in practice: the recurrence classifier already recognises what is clearly a
fixed expense on its own — that never reaches the assistant. What reaches it is the doubtful
case: *"this looks recurring but I am not sure — is it?"*. An assistant that asks about
something it already knew is wasting the user's attention.

---
## 💡 Insights — questions about money and wealth

### Daily management, budgets, and spending

| User question | How it answers | Implemented | Approved | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **How much can I spend today without wrecking the month?** | Large figure (€/day) in Daily Safe to Spend (`safe_to_spend`) | ✅ | ❌ | Appears on the dashboard once there is data. Validate the daily figure against real data. |
| **Am I spending too fast this month?** | Weekly pace bar vs. history (`spending_velocity`) | ✅ | ❌ | Validate that the 7-day pace reflects real flow. |
| **Have I gone over any budget?** | Alert with the amount exceeded (`category_overspend`) | ✅ | ❌ | Alert works in the engine. Filter parameter consumption in the UI still to resolve. |
| **Will the grocery budget last to the end of the month?** | Proportional time-consumption bar (`grocery_forecast`) | ✅ | ❌ | Compares % of time elapsed against % of amount spent. |
| **How are the holidays/projects I am running going?** | Daily pace plus progress of atypical spending (`vacation_budget_active`) | ✅ | ❌ | Isolates project spending without polluting the year's averages. |
| **Which subscriptions am I paying for?** | Mini-table of regular monthly charges (`active_subscriptions`) | ✅ | ❌ | Lists services with confirmed consistency and monthly periodicity. |
| **Has any fixed bill gone up?** | Percentage comparator of usual bills (`bill_increase`) | ✅ | ❌ | Fires when a usual expense rises more than 15% against history. |
| **Did I save anything this period?** | Large figure (+€) of positive net balance (`positive_savings`) | ✅ | ❌ | Positive balance of income minus expenses for the cycle. |
| **Which of my transactions broke the pattern?** | Compact list of anomalous transactions (`outlier_transactions`) | ✅ | ❌ | Statistical isolation per category over the last 90 days. |
| **How is my balance evolving, month by month?** | Flow bars vs. real balance line (`balance_average`) | ✅ | ❌ | Requires at least 2 months of consolidated history. |
| **How much of what I earn do I keep?** | Savings rate percentage (`savings_rate`) | ✅ | ❌ | Direct `(Income - Expenses) / Income` ratio for the cycle. |
| **Did I spend more on essentials or non-essentials this month?** | Proportion chart: essentials vs. lifestyle (`essential_vs_lifestyle`) | ✅ | ❌ | Classification based on the essential-categories catalogue. |
| **How many months of expenses does my balance cover?** | Months of runway with the reserve (`emergency_fund`) | ✅ | ❌ | Spendable balance ÷ 6-month average of essential expenses. |
| **What share of my income goes to fixed commitments?** | Percentage of income absorbed by fixed costs (`fixed_cost_ratio`) | ✅ | ❌ | Fixed costs and usual commitments against monthly income. |
| **Which budgets are under the most pressure?** | Comparative budget-pressure bars (`category_pressure`) | ✅ | ❌ | Flags categories that have reached more than 75% of their cap. |
| **Do I have room in my income to top up a budget this month (e.g. sales season)?** | Budget-capacity calculator and simulator checking whether the increase fits the month's income after fixed costs and savings (`budget_headroom_calculator`) | ❌ | ❌ | One-off simulation for atypical months (sales, holidays, back to school) without changing the annual base cap. |

### Portfolio, assets, and consolidated wealth

| User question | How it answers | Implemented | Approved | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **How much of my wealth is locked up vs. accessible?** | Breakdown: free vs. reserved vs. invested vs. illiquid (`patrimony_split`) | ✅ | ❌ | Factual visual split of liquidity across total wealth. |
| **What percentage of the mortgage/home have I paid off?** | Amortisation bar and instalment count (`property_equity`) | ✅ | ❌ | Ratio of instalments paid vs. total contracted. |
| **What real income have my investments produced so far?** | Accumulated value of income received (`portfolio_income`) | ✅ | ❌ | Net proceeds since the date of the first payout. |
| **How did the holidays/projects go, now that they are over?** | Retrospective: total spent, 3 most expensive days, and leftover (`project_retrospective`) | ✅ | ❌ | Post-close analysis of any project envelope. |
| **How much do I have invested and what is my total wealth?** | Central card detailing assets and broker liquidity | ✅ | ❌ | Integrate `investmentBalance` into consolidated total wealth. |
| **What is my portfolio's unrealised gain?** | Unrealised return (+X € / +Y%) via the simulator with a manual quote (USD/EUR) | ✅ | ❌ | Inline simulator on the card with currency conversion and projected return, fully private. |
| **How much of my wealth is mine and how much is the bank's?** | Visual ratio: net assets vs. outstanding debt | ❌ | ❌ | Outstanding debt against illiquid asset value. |
| **How much of my wealth is exposed to market risk?** | Percentage split: guaranteed vs. market-exposed | ❌ | ❌ | Classification by risk profile of the assets held. |

### Questions under study / new scenarios

| User question | State | Product reasoning / YMYL framing |
| :--- | :--- | :--- |
| **What is my position worth at quote X (USD/EUR), and when should I sell?** | Under study | Simulator on the allocations card: the user enters a quote (USD/EUR), it computes conversion and unrealised gain; the assistant suggests a target sale value based on goals. |
| **Do I have room for an impulse purchase today?** | Under study | Real free balance minus the budgets and fixed costs still due before the end of the cycle. |
| **Where is money leaking without me noticing?** | Under study | Aggregate of micro-expenses (< €10) when they exceed 10% of the month's total spend. |
| **Has my lifestyle grown with my income?** | Under study | Compares the half-yearly rise in income against the rise in discretionary spending. |
| **How many days until the wave of heavy bills?** | Under study | Sum of recurring debits expected in the 7 days after income lands. |
| **Have I spent less this month than at the same date last month?** | Under study | Like-for-like comparison of cumulative spend to the same day of the month. |
| **Do I have enough money for the holiday I want?** | Under study | Depends on introducing the concept of goals in projects. |
| **If I raise this budget by €X for the sales, do I still cover every expense until next payday?** | Under study | Budget-capacity calculator crossing expected income, scheduled fixed debits, and the caps of the other categories to validate the real headroom. |

---

## 🛠️ Assistant — what the app cannot decide alone

Every assistant intervention resolves the grey zone with a direct one-click action (`accept` / `reject`) or navigation with filters already applied.

| Question the assistant asks | Grey zone (what it needs from the user) | Implemented | Approved | One-click action (CTA) |
| :--- | :--- | :---: | :---: | :--- |
| **You have no accounts yet — create one or import?** | Initial onboarding | ✅ | ❌ | Opens the import/create dialog (`open_add_entry`) |
| **You have {count} transactions to review — shall we?** | Triage of a new import | ✅ | ❌ | Navigates to `/movements?filter=pending_review` |
| **You have {count} uncategorised transactions — categorise them?** | Missing categorisation | ✅ | ❌ | Navigates to `/movements?filter=uncategorized` |
| **You spend a lot on {name} with no budget — set one?** | Budget cap not set | ✅ | ❌ | Navigates to `/budget` with the category preselected |
| **This looks like a duplicate charge — is it?** | Two outgoings of equal amount and identical description | ✅ | ❌ | `[Confirm duplicate]` / `[Not a duplicate]` (`open_reconcile_dialog`) |
| **This transfer has no counterpart — which account did it come from?** | An outgoing classified as a transfer with no matching pair | ✅ | ❌ | `[Link transfer]` / `[Not a transfer]` (`open_reconcile_dialog`) |
| **Your holiday has ended — close the project?** | Closing a time-boxed holiday envelope | ✅ | ❌ | `[Close project and release leftover]` / `[Keep open]` |
| **This looks like a recurring expense ({description}) — confirm?** | A monthly charge with a pattern detected in the grey zone | ✅ | ❌ | `[Yes, recurring]` / `[No, one-off]` |
| **I detected a recurring credit of {amount}. Is it your salary?** | Identifying the regular primary income | ✅ | ❌ | `[It is salary]` / `[Other income]` |
| **I detected an outgoing of {amount} to {broker}. Link it to an asset?** | Exact destination of an investment top-up | ✅ | ❌ | `[Link to asset]` / `[Other]` |
| **You have {amount} in broker cash. Count it as investment or free balance?** | Accounting policy for the brokerage account | ✅ | ❌ | `[Investment]` / `[Free balance]` |
| **{amount} left over for {count} months running. Create a savings goal?** | Structural vs. one-off surplus | ✅ | ❌ | `[Create goal]` / `[Keep available]` |
| **This asset ({name}) has not been updated in 12 months. Is the value still right?** | Checking the static value of illiquid assets | ✅ | ❌ | `[Keep value]` / `[Update]` |
| **You hit the {target}% goal on {name}. Simulate or record the sale?** | The position reaches or exceeds the defined target sale value | ✅ | ❌ | `[Simulate sale]` / `[Adjust target]` / `[Keep]` |
| **The {name} budget is at its limit and it is sales season. Raise the cap for this month only?** | Atypical spend concentrated in a sales/campaign cycle, beyond the usual pattern | ❌ | ❌ | `[Add +{amount} this month]` / `[Open calculator]` / `[Keep]` |

---

## 📌 Known debt and blockers

### Structural and business blockers (unblocked / resolved)

- [x] **Goals in projects / savings:** The `Budget` model now supports `targetAmount` and `targetDate` for structured goals, with a suggested monthly savings pace and integration into the allocation form.
- [x] **Broker account liquidity:** The `investmentBalance` with `includeInConsolidatedBalance === true` is now consolidated directly into the Dashboard's Real Free Balance.
- [x] **Market quotes and privacy:** The local position-sale simulator is implemented ([`PositionSellSimulatorDialogComponent`](apps/oh-save-me/src/app/ui/components/organisms/position-sell-simulator-dialog/position-sell-simulator-dialog.ts)) with automatic gross capital-gain calculation, estimated withholding (28% Portuguese income tax), and net proceeds, fully private and on-device.

---

## ✅ How to approve

To mark a question as approved:

1. Open the app with real data (personal statements) — never with fixture data alone.
2. Confirm the calculation is mathematically sound and answers the question clearly and instantly.
3. Click the card's button or CTA and confirm it performs the action or opens the screen with exactly the intended context.
4. Swap ❌ for ✅ in the **Approved** column.

If the number does not make sense or the navigation fails, the row stays ❌ and the reason is recorded in Notes so the rule or threshold can be adjusted.