# Oh Save Me!

Oh Save Me! (PT: _Oh poupa-me!_) is a personal and family finance assistant. It answers
questions such as "can I afford a holiday this month?" instead of handing over a spreadsheet,
imports bank statements, and categorises them on the device.

- **Local-first.** Data lives in RxDB on the device (IndexedDB through Dexie). Nothing is
  analysed anywhere else.
- **Learns on the device.** Column detection for statement imports and category suggestions run
  locally, from the user's own corrections.
- **Sync through the user's own Google Drive.** A private vault and, optionally, a joint vault
  shared with someone else.

| Document                       | Holds                                                                 |
| :----------------------------- | :-------------------------------------------------------------------- |
| [MVP.md](./MVP.md)             | The shipped feature set                                               |
| [PRD.md](./PRD.md)             | The product vision, requirements and roadmap                          |
| [ASSISTANT.md](./ASSISTANT.md) | The questions the app answers, and which are implemented and approved |

This app is a submodule of [ibid-workspace](https://github.com/alexibid/ibid-workspace) and is
built from there.

## Platforms

| Platform | How                              | Delivered                                                   |
| :------- | :------------------------------- | :---------------------------------------------------------- |
| Web      | Angular build                    | Firebase Hosting, site `ibid-ohsaveme`                      |
| Android  | Capacitor 8 (`platforms/mobile`) | APK attached to the release and uploaded to Google Drive    |
| iOS      | Capacitor 8 (`platforms/mobile`) | Opened in Xcode with `npm run mobile:ios`; not built by CI  |
| macOS    | Tauri 2 (`platforms/desktop`)    | `.dmg` attached to the release and uploaded to Google Drive |

App id: `com.ohsaveme.app`.

## Structure

```
apps/oh-save-me/
  src/app/
    domain/          models, repository interfaces, rules, detectors and domain services
                     (column detection, category learning, suggestions, insights)
    application/     app store, selectors, use cases, CSV parsing, translations (pt, en)
    infrastructure/  RxDB repositories and schemas, Google sign-in
    ui/              pages, templates, components, directives and pipes
  e2e/journeys/      18 Playwright journeys, including the accessibility audit
  platforms/
    desktop/         Tauri project (src-tauri)
    mobile/          Capacitor project (android, ios)
  scripts/           training script for the column classifier
  public/            static assets and manifest
```

Pages: dashboard, movements, budget, portfolio, categories and database. Every route has a
Portuguese path as well (`/orcamento`, `/carteira`, `/movimentos`…).

Selectors start with `ohsaveme-`. The app uses `ibid-ui` with the `sea-glass-pebbles` theme,
and `@ibid/services` for i18n, theme and Google Drive sync.

## Commands

Run from the workspace root.

| For                                         | Command                                 |
| :------------------------------------------ | :-------------------------------------- |
| Serve (port 4200)                           | `npm start`                             |
| Lint, tests, build and journeys             | `npm run check:oh-save-me`              |
| Unit tests                                  | `npx nx test oh-save-me`                |
| Journeys                                    | `npx nx e2e oh-save-me`                 |
| Accessibility audit                         | `npm run test:a11y`                     |
| Storybook (port 6007)                       | `npm run storybook:product`             |
| Desktop in development                      | `npm run desktop`                       |
| Desktop installer                           | `npm run desktop:build`                 |
| Copy the web build into the native projects | `npm run mobile:sync`                   |
| Open in Xcode / Android Studio              | `npm run mobile:ios` · `mobile:android` |
| Android APK                                 | `npm run mobile:apk`                    |

## Releases

Versions come from conventional commits with the `oh-save-me` scope. When CI is green on the
workspace's `main`, the automatic versioning bumps `package.json` and `CHANGELOG.md` here and
tags `oh-save-me-v<version>`. That tag runs the workspace's release workflow: web, APK and
macOS installer, named `oh-save-me.<version>.<ext>`.
