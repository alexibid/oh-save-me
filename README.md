# 📊 Oh Save Me!

Oh Save Me! (PT: *Oh poupa-me!*) is a personal and family finance **assistant** — built for people who want a direct answer ("do I have enough left to go on vacation this month?", "can I afford this?"), not a spreadsheet to interpret. It's not another expense tracker: it helps set up accounts and budgets with no manual configuration, and turns messy bank statements into clean, categorized, verified answers. Multi-platform target: Web, macOS, Windows, iOS, Android — see `PRD.md` §1.1 for the full persona.

Built on three core pillars: **Extreme Simplicity**, **Absolute Privacy (Local-First)**, and **High Customizability**. Statement import handles the variability of different banks' CSV/OFX exports through on-device machine learning (Bayesian classification, entirely local — models, when used, are downloaded once and run offline, never called as a live API) — no financial data is ever analyzed anywhere but the user's own device.

The project consolidates a shared frontend codebase in **Angular 18+** with **Angular Material** as the UI design system, Desktop distribution using **Tauri v2**, and Mobile distribution using **Capacitor v6**. All data is stored in a local, encrypted **RxDB** database. Private cross-device sync via the user's own Google Drive is planned but not yet implemented — see `PRD.md` §5.

See [`MVP.md`](MVP.md) for the shipped feature spec and [`PRD.md`](PRD.md) for the full vision and the active roadmap (§5).

---

## 🏗️ Project Structure

To maintain a clean and highly decoupled codebase, the repository is organized as follows:

```text
apps/oh-save-me/       # a app dentro do monorepo ibid-workspace
├── src/                # Shared Angular Frontend (Core & UI)
├── platforms/          # Native platform wrappers
│   ├── desktop/        # Tauri v2 configuration (macOS, Windows)
│   │   └── src-tauri/  # Rust native code, icons, and desktop builds
│   └── mobile/         # Capacitor v6 configuration (iOS, Android)
│       ├── android/    # Native Android Studio project
│       ├── ios/        # Native Xcode project
│       └── capacitor.config.ts
├── uploads/            # Local directory for statement uploads (Git ignored)
├── imports/            # Local directory for temporary imports (Git ignored)
├── PRD.md              # Product vision, requirements, and active roadmap
├── MVP.md              # MVP v0.1.0 spec — shipped feature set
├── .agents/            # Local directory for custom configurations (Git ignored)
└── package.json        # Global dependencies and orchestrator scripts
```

---

## 🏛️ Angular Directory Layout: Domain-Driven Design (DDD)

Within the `src/` directory, we strictly follow a **Domain-Driven Design (DDD)** directory structure to isolate business rules from framework implementation:

```text
src/
├── app/
│   ├── domain/         # Core business logic (Pure TypeScript)
│   │   ├── models/     # Domain entities & Value Objects (e.g., Transaction, Category)
│   │   ├── services/   # Pure domain services/validators
│   │   └── repositories/# Repository interfaces/abstract classes (e.g., TransactionRepository)
│   ├── infrastructure/ # Framework & external details implementation
│   │   ├── api/        # External HTTP services/APIs
│   │   ├── rxdb/       # Concrete RxDB database adapters/repositories
│   │   └── sync/       # Google Drive Sync engine implementation
│   ├── application/    # Orchestration and state management
│   │   ├── use-cases/  # Application use cases (e.g., ImportStatementUseCase)
│   │   └── state/      # Reactive states, facades, and Angular Signals
│   └── ui/             # Presentation layer (Angular components)
│       ├── components/ # Reusable UI components (Atomic Design)
│       │   ├── atoms/  # Basic indivisible elements (buttons, inputs, icons)
│       │   ├── molecules/# Combinations of atoms (form fields, search bars)
│       │   └── organisms/# Complex UI structures composed of molecules/atoms (navbar, list)
│       ├── templates/  # Page structure layouts
│       └── pages/      # Route-level views integrating templates with data
```

---

## 🎨 Styling Architecture & Conventions

To ensure scalable, modular, and maintainable styles, the application adopts:

### 1. SCSS & ITCSS (Inverted Triangle CSS)
Global styles are managed inside `src/styles/` and follow the ITCSS hierarchy to control specificity:
1.  **Settings**: Global variables, colors, typography, breakpoints (no CSS output).
2.  **Tools**: Mixins and utility functions (no CSS output).
3.  **Generic**: CSS resets (e.g., Normalize, box-sizing rules).
4.  **Elements**: Base styles for unclassed HTML elements (body, h1, button, a).
5.  **Objects**: Structure-only, non-cosmetic layout classes (grids, wrappers).
6.  **Components**: Specific component styles (imported locally in Angular components or globally if vendor-related).
7.  **Trumps**: Utility classes with `!important` for explicit overrides.

### 2. BEM Naming Convention (Block-Element-Modifier)
All styles inside components must follow the BEM naming methodology to keep CSS classes scoped, readable, and flat:
*   `.block` represents the top-level abstraction of a component (e.g., `.btn`, `.card`).
*   `.block__element` represents a child/descendant of the block (e.g., `.card__title`, `.card__footer`).
*   `.block--modifier` represents a modification or state of the block or element (e.g., `.card--active`, `.btn--disabled`, `.card__title--large`).


---

## 💎 Clean Code & Development Standards

The codebase must strictly adhere to the following principles and standards:

*   **Composition over Inheritance**
*   **Object-Oriented Programming (OOP)**
*   **SOLID Principles**
*   **Domain-Driven Design (DDD)** boundaries

### Meaningful Names
*   Use intention-revealing names.
*   Avoid disinformation and confusing abbreviations.
*   Make meaningful distinctions between names.
*   Use pronounceable names.
*   Use searchable names.
*   Avoid mental mapping (such as single-letter variables: `i`, `j`, `x`).
*   Use nouns for classes and types.
*   Use verbs for functions and methods.

### Functions
*   Keep functions as small as possible.
*   Do one thing (Single Responsibility).
*   Keep only one level of abstraction per function.
*   Write code that reads from top to bottom (The Stepdown Rule).
*   Limit the number of arguments to 0, 1, or 2 (avoid more than 3).
*   Do not use flag arguments (boolean parameters that change behavior).
*   Avoid any side effects.
*   Separate commands from queries (Command Query Separation).
*   Treat error handling as "one thing" within the function.
*   Avoid duplicate code (DRY - Don't Repeat Yourself).

### Comments
*   Explain decisions through readable code, not comments.
*   Remove any commented-out code (Dead Code).
*   Avoid redundant, noisy, or obvious comments.
*   Use comments only to explain complex architectural decisions or warn of consequences.

### Formatting and Organization
*   Keep files small (maximum of 200 to 300 lines).
*   Use vertical spacing to separate concepts and blocks of code.
*   Keep related concepts physically close in the file.
*   Declare variables as close as possible to where they are used.
*   Keep lines of code short (maximum of 100-120 characters).
*   Use consistent and automated indentation (Prettier/ESLint).

### Objects, Classes, and Data Structures
*   Hide internal implementation details through abstraction.
*   Clearly differentiate Objects (expose behavior, hide data) from Data Structures (expose data, have no behavior).
*   Respect the Law of Demeter.
*   Keep classes small and focused on a single responsibility.

### Error Handling
*   Use exceptions (throw errors) instead of returning error codes.
*   Write try-catch blocks first when structuring logic prone to failure.
*   Do not return null or undefined if it can be avoided.
*   Do not pass null or undefined as arguments to functions.

### TypeScript Best Practices
*   Strictly forbid the use of the `any` type (use `unknown` or Generics).
*   Use `readonly` to ensure the immutability of arrays and properties.
*   Avoid numeric enums (prefer union types or `as const`).
*   Use Optional Chaining (`?.`) and Nullish Coalescing (`??`) for null-safety.
*   Prefer Interfaces for public APIs and Type Aliases for unions and intersections.
*   Use Type Guards instead of manual type assertions (`as Type`).

---

## 🚀 Getting Started

### Installation

Install the required npm packages at the root of the project:
```bash
npm install
```

---

## 🛠️ Development & Build Commands

All orchestrator commands must be run from the project root:

### 🌐 Web / Core Frontend
* **Start local dev server:**
  ```bash
  npm run dev
  ```
* **Build web assets:**
  ```bash
  npm run build
  ```

### 💻 Desktop (Tauri)
* **Start Desktop app in dev mode (hot-reload):**
  ```bash
  npm run desktop:dev
  ```
* **Build native desktop packages (.dmg, .exe):**
  ```bash
  npm run desktop:build
  ```

### 📱 Mobile (Capacitor)
* **Synchronize web assets with native mobile folders:**
  ```bash
  npm run mobile:sync
  ```
* **Open native Android project in Android Studio:**
  ```bash
  npm run mobile:android
  ```
* **Open native iOS project in Xcode:**
  ```bash
  npm run mobile:ios
  ```

---

## 🌿 Git Branching Model: GitHub Flow & Conventional Commits

This project combines **GitHub Flow** (Git Flow adapted for GitHub) with **Conventional Commits** to manage branches and build a standardized git history.

### 1. Branching Model (GitHub Flow)
*   **`main` / `master`**: The stable branch. Anything here is production-ready.
*   **Feature/Bugfix Branches (`feature/*`, `fix/*`, `chore/*`)**: Created off `main` for any new development.
*   **Pull Requests (PR)**: When a feature is ready or needs feedback, a Pull Request is opened on GitHub. Once reviewed, approved, and passing CI/CD, the branch is merged into `main`.

### 2. Commit Message Convention (Conventional Commits)
All commit messages must adhere to the Conventional Commits specification:
```text
<type>(<scope>): <description>

[optional body]
```
Where `<type>` is one of:
*   `feat`: A new feature
*   `fix`: A bug fix
*   `docs`: Documentation only changes
*   `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
*   `refactor`: A code change that neither fixes a bug nor adds a feature
*   `perf`: A code change that improves performance
*   `test`: Adding missing tests or correcting existing tests
*   `chore`: Changes to the build process or auxiliary tools/libraries

### 3. Automated Validation (Husky & commitlint)
We use **Husky** hooks to automatically validate commit messages before they are recorded:
*   **`commit-msg`**: Triggers `commitlint` to check if the message matches the Conventional Commit standard. If it fails, the commit is rejected.

### 4. Cutting a Release (`commit-and-tag-version`)
Version bumps are derived from Conventional Commit history since the last tag, not chosen by hand:
```bash
npm run release
```
This reads every `feat`/`fix`/etc. commit since the last `v*` tag, bumps `package.json` accordingly, regenerates `CHANGELOG.md`, and creates a local commit + tag. Nothing is pushed automatically — review the result (`git log -1`, `git show`), then run:
```bash
npm run release:push
```
Pushing the tag is what triggers the release pipeline described below.

---

## 🚀 CI/CD & Releases

Two workflows cover verification; a single sequential pipeline covers delivery.

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every PR to `main`/`master` | Installs deps, runs unit tests (with a full pass/fail summary per suite), verifies the production build |
| `firebase-hosting-pull-request.yml` | Every PR | Deploys a temporary preview to Firebase Hosting and comments the link on the PR |
| `release.yml` | Push of a `v*` tag (or manual dispatch) | The full release pipeline, described below |

### The release pipeline (`release.yml`)

Pushing a `v*` tag runs five jobs **in sequence**, each gating the next — if one fails, nothing downstream runs:

```
Build → Test → Deploy Desktop → Deploy Mobile → Deploy Web
```

1. **Build** — installs deps, builds the Angular web bundle, uploads it as an artifact for later reuse.
2. **Test** — runs the full unit test suite against that build; its Job Summary lists every suite pass/fail plus a link to the full JSON report.
3. **Deploy Desktop** — builds Tauri installers (macOS `.dmg`, Windows `.msi`/`.exe`, Linux `.deb`/`.AppImage`) across 3 platforms in parallel, attached to the GitHub Release for the tag.
4. **Deploy Mobile** — builds the Capacitor Android `.apk`, attached to the same Release.
5. **Deploy Web** — reuses the artifact from step 1 (no rebuild) and deploys to [ohsaveme-app.web.app](https://ohsaveme-app.web.app/). Guarded to only run on a real tag push, never on a manual dispatch from an arbitrary branch.

**Nothing in `release.yml` runs on a plain merge to `master`** — only a tagged release triggers it. To ship a new version:
```bash
npm run release        # bumps version, updates CHANGELOG.md, creates a local commit + tag
npm run release:push   # pushes the tag, which triggers the pipeline above
```

**Where to check results:**
*   **GitHub Actions tab** → open the run → each job's card shows its own **Summary** (duration, produced files, direct links) — no need to dig through logs.
*   **GitHub Releases page** (`/releases`) → every `v*` tag publishes a Release with the desktop/Android installers attached, downloadable by anyone with repo access.

---

## 🧪 Spec-Driven TDD (Test-Driven Development)

This project strictly practices **Spec-Driven TDD (Test-Driven Development)**. Unit testing is not an afterthought; it drives our system design and implementation:

*   **Test-First / Spec-First Mindset**: Before writing production code for a domain model, repository, use-case, or service, write its corresponding `.spec.ts` unit test file.
*   **Red-Green-Refactor Cycle**: Ensure behavior is defined and fails first (Red), write the minimal code to make the test pass (Green), and then refactor for clean code keeping tests green.
*   **API Design Validation**: Specifications validate the design boundaries of our APIs. If a module is difficult to test, it indicates that the boundaries or abstractions are poorly defined.
*   **Continuous Testing**: Run `npm run test` regularly during development to verify that changes satisfy all business specifications and behave deterministically.

---

## 📸 UI Documentation & Visual Testing (Storybook & Playwright)

We employ **Visual Test-Driven Development (Visual TDD)** to ensure our components are isolated, robust, and visually accurate without manual inspection.
The manual use of `npm start` combined with browser DevTools is highly discouraged for validating UI component aesthetics and behavior.

### 1. Storybook for Component Isolation
Every UI component (`src/app/ui/components/**/*`) MUST have an accompanying `*.stories.ts` file. Storybook serves as our component catalog and isolated development environment.

*   **Start Storybook (Development):**
    ```bash
    npm run storybook
    ```
*   **Build Storybook (Static for CI):**
    ```bash
    npm run build-storybook
    ```

### 2. Playwright for Visual Regression (The Single Source of Truth)
We use Playwright to automate end-to-end tests against Storybook. The screenshots generated by Playwright inside the `test-results/` directory serve as the **absolute single source of truth** for visual verification.

*   **Run E2E UI Tests:**
    ```bash
    npm run test:e2e
    ```
*   **Run E2E UI Tests (with UI Viewer):**
    ```bash
    npm run test:e2e:ui
    ```

Whenever a UI change is made, developers must run the E2E tests and inspect the output in `test-results/` to confirm the styling was applied correctly. These screenshots must never be committed to git, they exist locally as a guaranteed visualization of the current codebase state.


