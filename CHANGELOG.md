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
