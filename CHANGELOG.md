# [0.23.0](https://github.com/zrebec/minefield/compare/v0.22.0...v0.23.0) (2026-06-16)


### Features

* **buildings:** high-angle buildings with textured roofs, windows, varied shapes ([bf5815b](https://github.com/zrebec/minefield/commit/bf5815b747701b91d7ae663ddb21a35ca1762bb9)), closes [hi#angle](https://github.com/hi/issues/angle)

# [0.22.0](https://github.com/zrebec/minefield/compare/v0.21.2...v0.22.0) (2026-06-16)


### Features

* **buildings:** replace linear walls with pseudo-3D buildings ([e2e9c05](https://github.com/zrebec/minefield/commit/e2e9c05c130bc617c5a87a788666c1f2be1f79c8))

## [0.21.2](https://github.com/zrebec/minefield/compare/v0.21.1...v0.21.2) (2026-06-15)


### Bug Fixes

* **rng:** seed createRng with a 32-bit int, not a raw float ([d4a87fe](https://github.com/zrebec/minefield/commit/d4a87fe3775098ba54ea70b9c90775ca062fd700))

## [0.21.1](https://github.com/zrebec/minefield/compare/v0.21.0...v0.21.1) (2026-06-09)


### Bug Fixes

* **game:** fully seed airplane behaviour for daily challenge ([11d3f6e](https://github.com/zrebec/minefield/commit/11d3f6ecd668e208cd54a80824682f0b86e296c0))

# [0.21.0](https://github.com/zrebec/minefield/compare/v0.20.0...v0.21.0) (2026-06-09)


### Features

* **highscore:** add date to highscore entries ([98514d9](https://github.com/zrebec/minefield/commit/98514d9a70147095211fa2c1ac04edf25fd436b2))

# [0.20.0](https://github.com/zrebec/minefield/compare/v0.19.0...v0.20.0) (2026-06-09)


### Features

* **game:** fully deterministic daily-seed challenge ([08abe7f](https://github.com/zrebec/minefield/commit/08abe7f03bc375c03b0d168b2e933e073babf5a9))

# [0.19.0](https://github.com/zrebec/minefield/compare/v0.18.0...v0.19.0) (2026-05-21)


### Features

* **i18n:** extract all UI text into swappable string packs ([8ac94cf](https://github.com/zrebec/minefield/commit/8ac94cfe492d7ce5d893bca446efa6bd18ff2875))

# [0.18.0](https://github.com/zrebec/minefield/compare/v0.17.1...v0.18.0) (2026-05-15)


### Features

* **save:** persistent save/load via zx-kit save module ([18ed737](https://github.com/zrebec/minefield/commit/18ed7376acb81338b85509d838f4512091a09214))

## [0.17.1](https://github.com/zrebec/minefield/compare/v0.17.0...v0.17.1) (2026-05-15)


### Bug Fixes

* **hiscore:** auto-confirm gamepad letter on Start and fix D-pad hint text ([1309072](https://github.com/zrebec/minefield/commit/1309072984b48380ccad0bb1e26131ec42157d49))

# [0.17.0](https://github.com/zrebec/minefield/compare/v0.16.0...v0.17.0) (2026-05-15)


### Features

* **input:** full gamepad support — audio prompt, speed fix, hiscore D-pad ([0ddebea](https://github.com/zrebec/minefield/commit/0ddebeac8837ac8232cf5f4c16ba99cc66be16f2))

# [0.16.0](https://github.com/zrebec/minefield/compare/v0.15.2...v0.16.0) (2026-05-15)


### Features

* **input:** enable gamepad support on intro and gameover screens ([1f8d9f3](https://github.com/zrebec/minefield/commit/1f8d9f3826710f1806d0b6dead2b56757e97b8a6))

## [0.15.2](https://github.com/zrebec/minefield/compare/v0.15.1...v0.15.2) (2026-05-14)


### Bug Fixes

* **intro:** shrink scene by 1 row to prevent blink text overlap ([41de266](https://github.com/zrebec/minefield/commit/41de2666bfb7f9b295ad2b42c2cb87171007915a))

## [0.15.1](https://github.com/zrebec/minefield/compare/v0.15.0...v0.15.1) (2026-05-14)


### Bug Fixes

* **ux:** restrict intro start keys + fix hiscore name alignment ([3ec9ea9](https://github.com/zrebec/minefield/commit/3ec9ea9d751daa0d2492e95fc8f2a5620f86552d))

# [0.15.0](https://github.com/zrebec/minefield/compare/v0.14.0...v0.15.0) (2026-05-13)


### Features

* **walls:** add brick walls as solid obstacles per level ([9166a42](https://github.com/zrebec/minefield/commit/9166a42d7d2b16f12879b4ffc11229571d6efe25))

# [0.14.0](https://github.com/zrebec/minefield/compare/v0.13.0...v0.14.0) (2026-05-12)


### Features

* **intro:** replace text-only intro with pixel-art minefield scene ([e3a939d](https://github.com/zrebec/minefield/commit/e3a939d93399abcf780f191398a16585535e9c7b))

# [0.13.0](https://github.com/zrebec/minefield/compare/v0.12.3...v0.13.0) (2026-05-10)


### Features

* **player:** animate walk between cells, defer mine reveal until step lands ([7ba1696](https://github.com/zrebec/minefield/commit/7ba16961e8c7337846e78beae4b08d0b89893e1b))

## [0.12.3](https://github.com/zrebec/minefield/compare/v0.12.2...v0.12.3) (2026-05-08)


### Bug Fixes

* **deps:** upgrade zx-kit to ^0.10.0, read installed version from node_modules ([35ee34e](https://github.com/zrebec/minefield/commit/35ee34e756f74a5a850a7851cdf88fa57158b361))

## [0.12.2](https://github.com/zrebec/minefield/compare/v0.12.1...v0.12.2) (2026-05-08)


### Bug Fixes

* **security:** defensive highscore parsing, remove dead code, fix CSP, sync version ([2cb8728](https://github.com/zrebec/minefield/commit/2cb8728f9018288514c783b3ba17494925a65bfd))

## [0.12.1](https://github.com/zrebec/minefield/compare/v0.12.0...v0.12.1) (2026-05-04)


### Bug Fixes

* **main:** slighthly less display curvating ([94aa51a](https://github.com/zrebec/minefield/commit/94aa51a52349c46c13a511b8c88c4f2ed388e157))

# [0.12.0](https://github.com/zrebec/minefield/compare/v0.11.1...v0.12.0) (2026-05-04)


### Features

* **display:** apply CRT curvature effect via zx-kit curveDisplay() ([217b6ae](https://github.com/zrebec/minefield/commit/217b6ae0301f21d94b10be35c3e3c35388e06abe))

## [0.11.1](https://github.com/zrebec/minefield/compare/v0.11.0...v0.11.1) (2026-05-03)


### Bug Fixes

* **renderer:** gems remain visible at night — only ground and mine tiles blacked out ([730841e](https://github.com/zrebec/minefield/commit/730841ee0fa1387549e3934a723bf81a41c5720d))

# [0.11.0](https://github.com/zrebec/minefield/compare/v0.10.0...v0.11.0) (2026-05-03)


### Features

* **ui:** replace lives blocks with heart sprites, tighten cycle timing ([14a637c](https://github.com/zrebec/minefield/commit/14a637cdbb225ce9e6c95858d8e2e299df949830))

# [0.10.0](https://github.com/zrebec/minefield/compare/v0.9.0...v0.10.0) (2026-05-03)


### Features

* **gameplay:** add day/night cycle with black-out night visibility ([4c5a53f](https://github.com/zrebec/minefield/commit/4c5a53fb786354ef438b3c2216b6b8d71662854a))

# [0.9.0](https://github.com/zrebec/minefield/compare/v0.8.0...v0.9.0) (2026-05-03)


### Features

* **audio:** terrain-specific footstep sounds for grass/snow/dust ([183ae65](https://github.com/zrebec/minefield/commit/183ae65feac1ed1d867a97099c76bd232eaa9597))

# [0.8.0](https://github.com/zrebec/minefield/compare/v0.7.1...v0.8.0) (2026-05-03)


### Features

* **renderer:** add CRT scanline overlay via zx-kit drawScanlines ([d9a2816](https://github.com/zrebec/minefield/commit/d9a2816d9dd5b040e12781cff953d6bf66c83fff))

## [0.7.1](https://github.com/zrebec/minefield/compare/v0.7.0...v0.7.1) (2026-05-03)


### Bug Fixes

* **ci:** checkout main HEAD after semantic-release so build tag is correct ([0233128](https://github.com/zrebec/minefield/commit/0233128465fd518860e0084af9296885e041a78f))

# [0.7.0](https://github.com/zrebec/minefield/compare/v0.6.2...v0.7.0) (2026-05-03)


### Features

* **terrain:** add per-level terrain system with grass/snow/dust themes ([a92b794](https://github.com/zrebec/minefield/commit/a92b7943a46f866ef3888dd06954522a342cdb13))

## [0.6.2](https://github.com/zrebec/minefield/compare/v0.6.1...v0.6.2) (2026-05-02)


### Bug Fixes

* github actions merged into 1 file ([e300a80](https://github.com/zrebec/minefield/commit/e300a80ab5168752607a34379fbbba1fd2119a05))

## [0.6.1](https://github.com/zrebec/minefield/compare/v0.6.0...v0.6.1) (2026-05-02)


### Bug Fixes

* node-version upgraded ([929ab1f](https://github.com/zrebec/minefield/commit/929ab1f2e1b3f473e3e330533fbb289e03cf6df2))

# Changelog

## [Unreleased]
### Added
- Fog of War using zx-kit 0.5.x (planned)

## [0.5.1] - 2026-05-02
### Changed
- Updated zx-kit dependency to latest
- Fixed highscore and SpectrumColor palette usage

## [0.5.0] - 2026-05-02
### Added
- Full migration to zx-kit **TileMap** for grid management (mines, gems, visited, flags)
- SpectrumColor type safety
- Highscore system

### Changed
- Cleaner renderer thanks to TileMap
