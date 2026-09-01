# Changelog

> **Nota de rebrand.** Este produto chamou-se **SavvyJar** até à versão 1.6.2. Passou a
> chamar-se **Oh Save Me!** (em português, **Oh poupa-me!**) e migrou para o monorepo
> `ibid-workspace`, onde recomeça a numeração em `0.0.0`. As entradas abaixo são o histórico
> real das versões 1.x e ficam por reescrever de propósito — são registo do que aconteceu.

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.6.2](https://github.com/alexibid/SavvyJar/compare/v1.6.1...v1.6.2) (2026-08-30)

### Bug Fixes

* **auth:** add direct OAuth redirect flow and hash token parser for Capacitor Android ([6ccd670](https://github.com/alexibid/SavvyJar/commit/6ccd670dac0e912bc1828182822b9595130ace20))
## [1.6.1](https://github.com/alexibid/SavvyJar/compare/v1.6.0...v1.6.1) (2026-08-30)

### Bug Fixes

* **perf:** resolve process type reference in performance monitor for browser build ([e3d0b74](https://github.com/alexibid/SavvyJar/commit/e3d0b743af1f1bd97b54dcdb538aa72f241e0aaf))
## [1.6.0](https://github.com/alexibid/SavvyJar/compare/v1.5.1...v1.6.0) (2026-08-30)

### Features

* **sync:** add multi-vault sharing, account badges and share manager ([2080755](https://github.com/alexibid/SavvyJar/commit/20807556a5b78ea4b90004272e28a3c1749a4fe5))
## [1.5.1](https://github.com/alexibid/SavvyJar/compare/v1.5.0...v1.5.1) (2026-08-30)

### Bug Fixes

* **ui:** overhaul database management views, navigation controls, and visual styling ([297c9f2](https://github.com/alexibid/SavvyJar/commit/297c9f2ad38b6ede6fcfb1bf5b093b12de9c6ec9))
## [1.5.0](https://github.com/alexibid/SavvyJar/compare/v1.4.0...v1.5.0) (2026-08-29)

### Features

* **assistant:** implement profit target detection, position sell simulator and structured goals ([c78dab4](https://github.com/alexibid/SavvyJar/commit/c78dab49d3d63868cefcbc8deee8c27699067e7d))
## [1.4.0](https://github.com/alexibid/SavvyJar/compare/v1.3.0...v1.4.0) (2026-08-29)

### Features

* **portfolio:** remove date and keyword restrictions from available movements dialog ([eadb884](https://github.com/alexibid/SavvyJar/commit/eadb884a0a612ccc45c33db4071a71ddac456a33))
## [1.3.0](https://github.com/alexibid/SavvyJar/compare/v1.2.0...v1.3.0) (2026-08-29)

### Features

* **assistant:** handle salary confirmation and register financial insights ([c937201](https://github.com/alexibid/SavvyJar/commit/c937201f4464568edcfc6ccce132e51b2482ca61))
* **dashboard:** split dual-intelligence insights, enhance categorization rules with selected sort ([86d3b62](https://github.com/alexibid/SavvyJar/commit/86d3b62cb5b4392baff496f7ac5ef5526da4da9b))
* **filters:** unify all special, search and overspend filters into active filter chips ([de1e680](https://github.com/alexibid/SavvyJar/commit/de1e680c0230474c7f446852deb9e657239151fb))

### Bug Fixes

* **dashboard:** stop redundant RxDB reloads and duplicate insight recomputation on navigation ([4f35935](https://github.com/alexibid/SavvyJar/commit/4f359359a308b617d3ab760ec7d43853f56f9088))
* **insights:** measure spending pace over the pay cycle and report it weekly ([31ce4ab](https://github.com/alexibid/SavvyJar/commit/31ce4ab418681c9ef6fe54ef5db49ad1b5cedf74))
* **insights:** pace spending over a rolling week and cap the limit at real money ([42c0882](https://github.com/alexibid/SavvyJar/commit/42c0882c56c9ccd4de4b68a5abc0505d65085a7b))
* **insights:** widen the anomaly window, guard incomplete periods and pin the e2e clock ([ee2cd4a](https://github.com/alexibid/SavvyJar/commit/ee2cd4ac4ff7b08dac6e40d74e1406d6605ba499))
## [1.2.0](https://github.com/alexibid/SavvyJar/compare/v1.1.1...v1.2.0) (2026-08-27)

### Features

* **portfolio:** add carteira page reusing the shared allocation organisms ([4355460](https://github.com/alexibid/SavvyJar/commit/4355460c09bf35b2169d25d7b3ff87534fe136cc))
* **portfolio:** track broker positions and recorded assets on the carteira page ([1d178d2](https://github.com/alexibid/SavvyJar/commit/1d178d2d7ba1433de862100535268544f44e5c1f))
* **portfolio:** value house and car by loan repayment, chart asset balance, fix dashboard leakage ([07e6372](https://github.com/alexibid/SavvyJar/commit/07e6372e5ea4b6f3691fcb2f7cddebfd24fc60d8))
## [1.1.1](https://github.com/alexibid/SavvyJar/compare/v1.1.0...v1.1.1) (2026-08-27)

### Bug Fixes

* **ui:** header on 360px problem ([dd83e31](https://github.com/alexibid/SavvyJar/commit/dd83e31496db4ec4256f233da6fb203f6794497c))
## [1.1.0](https://github.com/alexibid/SavvyJar/compare/v1.0.1...v1.1.0) (2026-08-27)

### Features

* **dashboard:** add a balance trend insight smoothed over a 60-day window ([e493879](https://github.com/alexibid/SavvyJar/commit/e4938794d1cce5a147ac458deaa3e4ebac314f6b))
* **dashboard:** archive dismissed insights with assisted back-navigation ([92ce85a](https://github.com/alexibid/SavvyJar/commit/92ce85a16d39245b4186052746fcbd38a84faf8a))
* **dashboard:** implement native dashboard insights component with rich visual archetypes ([788e184](https://github.com/alexibid/SavvyJar/commit/788e184acbf3b8aaed0a2212db5bcfc5d1bb15db))
* **dashboard:** replace the category chart with inline assistant alerts ([616fcc1](https://github.com/alexibid/SavvyJar/commit/616fcc1b9e2d5606a44d52b347943aba2a270055))
* **dashboard:** snooze acted insights and keep an empty state in place ([f1988b3](https://github.com/alexibid/SavvyJar/commit/f1988b3a415decd5533a8c709d5d6c27840abe17))

### Bug Fixes

* **i18n:** replace "Reserva" with "Poupança" and label over-budget cards as such ([f9748ba](https://github.com/alexibid/SavvyJar/commit/f9748ba4043ef997ec7bf1e02262a8978b4ce3e7))
* **movements:** apply the overspend query param instead of silently ignoring it ([cb488cd](https://github.com/alexibid/SavvyJar/commit/cb488cd6e6665cef6fb9a5b44e7e90d3f88c95bf))
## [1.0.1](https://github.com/alexibid/SavvyJar/compare/v1.0.0...v1.0.1) (2026-08-26)

### Bug Fixes

* **ci:** drop the stale @storybook/blocks that broke npm ci in every workflow ([0e15790](https://github.com/alexibid/SavvyJar/commit/0e1579080207a156022a6429e183255b199cb9bc))
* **ci:** replace private statement fixtures with committed fictional CSVs ([85fec19](https://github.com/alexibid/SavvyJar/commit/85fec19c07e2aeca71a309509f5ca10508ddfb89))
## [1.0.0](https://github.com/alexibid/SavvyJar/compare/v0.2.2...v1.0.0) (2026-08-26)
## [0.2.2](https://github.com/alexibid/SavvyJar/compare/v0.2.1...v0.2.2) (2026-08-26)

### Features

* **budget:** stop project assignments being undone on reload and keep vacation windows in sync ([1778f70](https://github.com/alexibid/SavvyJar/commit/1778f70882e0fbc73e6f4c0a1f67ba3f4b3a3584))
## [0.2.1](https://github.com/alexibid/SavvyJar/compare/v0.2.0...v0.2.1) (2026-08-25)

### Bug Fixes

* **budget:** stop counting project transactions under their category as well ([7aa1640](https://github.com/alexibid/SavvyJar/commit/7aa164049ccb523c77e7c3205b5e0a53e3e37f65))
* **movements:** treat picking the current category as taking the movement out of its project ([1e923cd](https://github.com/alexibid/SavvyJar/commit/1e923cd48806c194824e39b85e03d486be9994b3))
## [0.2.0](https://github.com/alexibid/SavvyJar/compare/v0.1.2...v0.2.0) (2026-08-25)

### Features

* **assistant:** add proactive suggestion engine with vacation tracking ([a1ddd1a](https://github.com/alexibid/SavvyJar/commit/a1ddd1a8dfabfcf9e5b26f6fea055255d6a71c3c))
* **budget:** unify category/project classification with mutually-exclusive smart-budget-cell, add Naive Bayes recurring-transaction detection, and fix table alignment/overflow bugs ([deae179](https://github.com/alexibid/SavvyJar/commit/deae179fd2dc1bf723f30cc3307ed0877827d53c))
* **dashboard:** exclude investments from free balance, add a savings card, and fix the import-assistant account picker ([ae335ea](https://github.com/alexibid/SavvyJar/commit/ae335ead9412cf69c924f29024f6735e58ffe78e))
* **movements:** fix recurring-transaction detection and explain it via an info balloon with a matching filter ([2e95e02](https://github.com/alexibid/SavvyJar/commit/2e95e028cd425f3b6d1246044b0aad78a54d51d4))

### Bug Fixes

* **budget:** store E2E test screenshots strictly in test-results directory ([f33cc53](https://github.com/alexibid/SavvyJar/commit/f33cc53d4200b491c66acb5f5ba0343f12058738))
## [0.1.2](https://github.com/alexibid/SavvyJar/compare/v0.1.0...v0.1.2) (2026-08-19)

### Features

* **assistant:** add mobile-first header suggestion carousel with i18n and RxDB persistence ([6b5b75e](https://github.com/alexibid/SavvyJar/commit/6b5b75eabfe4768073841ebd29602e6881a53624))
* **branding:** rebrand to SavvyJar with new icon set and app identifiers ([6571654](https://github.com/alexibid/SavvyJar/commit/65716546341f044072a87b8a5b687aa393dd8bb7))
* **charts:** add chart domain model, base atoms and legend/headline molecules ([3e70088](https://github.com/alexibid/SavvyJar/commit/3e70088232f54f7ec2d236dd79e40f723a6fd5c5))
* **movements:** add domain/application layer for the compact list redesign ([5e43af1](https://github.com/alexibid/SavvyJar/commit/5e43af16d35aedc627620ff0292152c5f5784ec2))
* **movements:** add smart-cell atoms and the record detail balloon ([2c2709a](https://github.com/alexibid/SavvyJar/commit/2c2709aaab459c61e39a3e5d6540c826128c6387))
* **movements:** wire the compact transaction list into the Movimentos page ([043cea6](https://github.com/alexibid/SavvyJar/commit/043cea6e21009d5dfde6e5e9ec0821629ba8310f))
* **ui:** add transaction button to sidenav, restore header action and fix apk install script ([1080010](https://github.com/alexibid/SavvyJar/commit/1080010b267869f29d2a5e2fe011ab5710d68e98))
* **ui:** enhance assistant peek cards with multi-line expansion and action button ([d1a2a7b](https://github.com/alexibid/SavvyJar/commit/d1a2a7b182cad990c6e66a3102702fc0ae73d8b2))
* **ui:** extract assistant from header into independent bottom sheet system ([c0739aa](https://github.com/alexibid/SavvyJar/commit/c0739aa78d08cf7102e28049d26b6b355d4e58b5))
* **ui:** refactor to native svg charts and align header elements to 42px ([04ebeb7](https://github.com/alexibid/SavvyJar/commit/04ebeb7fbcd7747f2817f49d175a79fe26b152f1))

### Bug Fixes

* **a11y:** pick pill text color by WCAG contrast instead of fixed white ([b88b04c](https://github.com/alexibid/SavvyJar/commit/b88b04c5b31abac0c650cfeecab52a7fd949df49))
* **categories:** correct Investments/Interest icon keys pointing at a nonexistent file ([d7eb908](https://github.com/alexibid/SavvyJar/commit/d7eb9086a20a4793543a8ed398db25ce85d4c131))
* **ci:** pass Tauri config via args instead of unsupported configPath ([a9a3e3f](https://github.com/alexibid/SavvyJar/commit/a9a3e3f4cf02f7f1c354efee38f851c78f38cf4d))
* **header:** make assistant toggle clickable and simplify collapse logic ([1988970](https://github.com/alexibid/SavvyJar/commit/1988970099c0071a9af1ecb9e08216baf5588df0))
* **style/ui:** fix for qa ([102fb6f](https://github.com/alexibid/SavvyJar/commit/102fb6f0d9091eb4604667aa36b78c29242b6ef7))
* **ui:** correct date picker overlay positioning and styling ([e64bd5c](https://github.com/alexibid/SavvyJar/commit/e64bd5c08c30f86dc2953c582b5586d51f345716))
* **ui:** drop redundant table header in dialogs, fix sticky glitch, move balloon trigger ([873a143](https://github.com/alexibid/SavvyJar/commit/873a1430e056556ef812f05e1b825d9e70d25708))
* **ui:** problems with dialogs ([af097ca](https://github.com/alexibid/SavvyJar/commit/af097ca3c062f3dcaf7ae9b569fa1c5027e16b3e))
* **ui:** restore card background, secondary variant styling and bg-opacity token ([12044f7](https://github.com/alexibid/SavvyJar/commit/12044f7f29bf3c0694d59121b1ba229fc970e441))
