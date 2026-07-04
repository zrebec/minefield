## [0.49.1](https://github.com/zrebec/minefield/compare/v0.49.0...v0.49.1) (2026-07-04)


### Bug Fixes

* **render:** flags stay visible at night — night sweep goes through hiddenAtNight ([1872e29](https://github.com/zrebec/minefield/commit/1872e29e3d0a184ab180d77014d2925863e8aca9))

# [0.49.0](https://github.com/zrebec/minefield/compare/v0.48.0...v0.49.0) (2026-07-04)


### Bug Fixes

* upgrade to v5 actions/deploy-pages ([4541bf7](https://github.com/zrebec/minefield/commit/4541bf7a09fab088c07cf35180c0877f0426159a))


### Features

* **game:** density-based mine budget over mine-eligible cells ([f5d197e](https://github.com/zrebec/minefield/commit/f5d197e1019517b88519e13c5078de13b9d5de4f)), closes [#2](https://github.com/zrebec/minefield/issues/2) [1/#2](https://github.com/zrebec/minefield/issues/2) [#2](https://github.com/zrebec/minefield/issues/2)

# [0.48.0](https://github.com/zrebec/minefield/compare/v0.47.1...v0.48.0) (2026-07-03)


### Bug Fixes

* **game:** guarantee field solvability by construction — carve repair ([fb8168a](https://github.com/zrebec/minefield/commit/fb8168a2f8fc43f096fbb47e87b7ce6d7214259d))


### Features

* **a11y:** ARIA skeleton, THE STRIP document title, live <html lang> ([6d65b5d](https://github.com/zrebec/minefield/commit/6d65b5d6216a3de0f44a0d55fa96e2bf8405528f)), closes [#sr-announcer](https://github.com/zrebec/minefield/issues/sr-announcer) [#sr-status](https://github.com/zrebec/minefield/issues/sr-status)

## [0.47.1](https://github.com/zrebec/minefield/compare/v0.47.0...v0.47.1) (2026-07-01)


### Bug Fixes

* **game:** airplane drops can no longer recreate obstacle-flanking traps ([2e4c351](https://github.com/zrebec/minefield/commit/2e4c351c8809659dbe0ef5880c2b2a483addd2cc))
* **save:** stop combo/reveal-budget bugs surviving a reload ([b2b6d23](https://github.com/zrebec/minefield/commit/b2b6d23d16b194d7af6713e33e7e08497a31d10e))

# [0.47.0](https://github.com/zrebec/minefield/compare/v0.46.0...v0.47.0) (2026-07-01)


### Features

* **flag:** SHIFT+arrow directional flagging; fix mine flag defusing itself ([7a30e54](https://github.com/zrebec/minefield/commit/7a30e54f919605434eaac2de45fd437ebad740d4))

# [0.46.0](https://github.com/zrebec/minefield/compare/v0.45.0...v0.46.0) (2026-07-01)


### Features

* **lang:** runtime EN/SK switch from the title screen ([791aeb6](https://github.com/zrebec/minefield/commit/791aeb6a7bb66d89726cebb930437dd52bb3c374))

# [0.45.0](https://github.com/zrebec/minefield/compare/v0.44.0...v0.45.0) (2026-06-30)


### Features

* new intro object in scene ([6ce3e23](https://github.com/zrebec/minefield/commit/6ce3e23678b8b5ba0285320573143ddccce45355))

# [0.44.0](https://github.com/zrebec/minefield/compare/v0.43.0...v0.44.0) (2026-06-29)


### Features

* **intro:** 5-card dramatic story, per-card AY score, chapter titles ([a800af4](https://github.com/zrebec/minefield/commit/a800af4ae85e3876b5d733b489557b5409cf40c6))

# [0.43.0](https://github.com/zrebec/minefield/compare/v0.42.0...v0.43.0) (2026-06-25)


### Bug Fixes

* **daily:** date the highscore by the run's daily, not wall-clock — game.ts, main.ts ([bda8e80](https://github.com/zrebec/minefield/commit/bda8e80d3ca8df7e3050643a7ca6fb97eeb9063f))


### Features

* **intro:** title-first flow — I replays, intro pre-rolls when due — config.ts, ([a7e24c6](https://github.com/zrebec/minefield/commit/a7e24c6931d4f2ce7aef5936f2ec31440297844b))

# [0.42.0](https://github.com/zrebec/minefield/compare/v0.41.1...v0.42.0) (2026-06-25)


### Bug Fixes

* **input:** calmer key-repeat ([c270d6c](https://github.com/zrebec/minefield/commit/c270d6c9ee4c965fa7bd202dc9ae9ad6111e5ed1))


### Features

* **audio:** AY intro underscore + typewriter tick ([b3c310d](https://github.com/zrebec/minefield/commit/b3c310db3207d2af9fd7cc8ee0925fa069fc1c55))
* **intro:** "The Strip" narrative intro + hand-drawn opening ([2046504](https://github.com/zrebec/minefield/commit/2046504b7cc379813c9e7b188021d9d7f1daf0d9))

## [0.41.1](https://github.com/zrebec/minefield/compare/v0.41.0...v0.41.1) (2026-06-23)


### Bug Fixes

* **player:** reset the score combo on death ([0fe5b3b](https://github.com/zrebec/minefield/commit/0fe5b3b25cce31bfa6c6cb4036555bce93e6c6ff))

# [0.41.0](https://github.com/zrebec/minefield/compare/v0.40.1...v0.41.0) (2026-06-23)


### Features

* **airplane:** BFS solvability guard before each drop + forward bias ([a331557](https://github.com/zrebec/minefield/commit/a3315574163f6720a0cc7b3f30321a9ac9616508))

## [0.40.1](https://github.com/zrebec/minefield/compare/v0.40.0...v0.40.1) (2026-06-22)


### Bug Fixes

* random revealch changed to reveal mines in random mode ([4854953](https://github.com/zrebec/minefield/commit/4854953d290d65ff9c55cee01bea2ef700c36acd))

# [0.40.0](https://github.com/zrebec/minefield/compare/v0.39.0...v0.40.0) (2026-06-22)


### Features

* **debug:** gate the D mine-reveal — disabled on daily, capped on random ([f2de4e7](https://github.com/zrebec/minefield/commit/f2de4e74f97b71fa45e01c1ed695468c19f6a663))

# [0.39.0](https://github.com/zrebec/minefield/compare/v0.38.0...v0.39.0) (2026-06-22)


### Features

* **game:** fenced field with one entry/exit gap and guaranteed solvability ([492d878](https://github.com/zrebec/minefield/commit/492d8781ce8a051326db743cce763d4e9502e95e))

# [0.38.0](https://github.com/zrebec/minefield/compare/v0.37.0...v0.38.0) (2026-06-21)


### Bug Fixes

* manually trigger semantic-release and deploy to GitHub Pages ([8542798](https://github.com/zrebec/minefield/commit/8542798c5dc76d0c6388aeab2adb4f1130369402))


### Features

* **config:** add CONTROLS list as the pause-help text source ([5bc6e5f](https://github.com/zrebec/minefield/commit/5bc6e5fbda81fbad41393c88c068af535b864e72))
* **i18n:** English pause-screen strings ([b997352](https://github.com/zrebec/minefield/commit/b997352de031b0b31eff2c4109ac6b54dd76e92b))
* **i18n:** Slovak pause-screen strings ([4d7e4a2](https://github.com/zrebec/minefield/commit/4d7e4a2b1aae4fb62b90e02d2d2dd9ff2359035c))
* **pause:** leaf pause pages with arrows ([dec519f](https://github.com/zrebec/minefield/commit/dec519f381e4224846d31c0710afea7e465caf9a))
* **pause:** render a paged pause screen ([99480d9](https://github.com/zrebec/minefield/commit/99480d950c94f28f218e9ac7f03a2779bec73f38))

# [0.37.0](https://github.com/zrebec/minefield/compare/v0.36.0...v0.37.0) (2026-06-21)


### Features

* **gems:** gold gem grants a score bonus on pickup ([ac7de38](https://github.com/zrebec/minefield/commit/ac7de389ca445c97dc03677fd69473b2a9ee4a0c))

# [0.36.0](https://github.com/zrebec/minefield/compare/v0.35.0...v0.36.0) (2026-06-21)


### Features

* **timer:** per-colour gem time bonus ([f8988f6](https://github.com/zrebec/minefield/commit/f8988f651217d9b1d9fc992f8336cd5888ae1e45))
* **timer:** per-colour gem time bonus ([29537fb](https://github.com/zrebec/minefield/commit/29537fb7b2c2005d9b156317ab998b41735d0e3e))

# [0.35.0](https://github.com/zrebec/minefield/compare/v0.34.0...v0.35.0) (2026-06-21)


### Features

* **timer:** gems grant time on pickup ([fb5e287](https://github.com/zrebec/minefield/commit/fb5e287ff47db8e2dc40bf3cf96798729ba43c44))

# [0.34.0](https://github.com/zrebec/minefield/compare/v0.33.0...v0.34.0) (2026-06-21)


### Features

* **timer:** per-level countdown that runs out into game over ([f5981b9](https://github.com/zrebec/minefield/commit/f5981b93b6c217b2be64288e6e0e3ec2ab4799e0))

# [0.33.0](https://github.com/zrebec/minefield/compare/v0.32.0...v0.33.0) (2026-06-21)


### Features

* **hud:** expand HUD to 6 rows (playfield 21->18) ([99dbc84](https://github.com/zrebec/minefield/commit/99dbc847f58d1073c6f84b14dab48c2973e30631))

# [0.32.0](https://github.com/zrebec/minefield/compare/v0.31.0...v0.32.0) (2026-06-20)


### Features

* **debug:** add zx-kit performance overlay ([f49f9f2](https://github.com/zrebec/minefield/commit/f49f9f206ba94e3c923cc8f0e04ed4bba625c1a4))

# [0.31.0](https://github.com/zrebec/minefield/compare/v0.30.1...v0.31.0) (2026-06-19)


### Features

* **mode:** explicit daily vs random with auto-resume ([1687baf](https://github.com/zrebec/minefield/commit/1687baf595f7b73afe3da93136d53209e4e6868f))

## [0.30.1](https://github.com/zrebec/minefield/compare/v0.30.0...v0.30.1) (2026-06-19)


### Bug Fixes

* **score:** keep random (R-rerolled) runs off the leaderboard ([3c0a68d](https://github.com/zrebec/minefield/commit/3c0a68d43e9469bc93273c25c93be6f0f7932b83))

# [0.30.0](https://github.com/zrebec/minefield/compare/v0.29.0...v0.30.0) (2026-06-19)


### Features

* **gems:** cyan gems reveal a live mine (3 cyan = 1 permanent reveal) ([af0812c](https://github.com/zrebec/minefield/commit/af0812ce35076f05c789d91e1915da390eb83a35))

# [0.29.0](https://github.com/zrebec/minefield/compare/v0.28.0...v0.29.0) (2026-06-19)


### Features

* **gems:** red gems convert to extra lives (2 red = +1 life) ([59a7110](https://github.com/zrebec/minefield/commit/59a7110ade582e361bc1f9df9385f255a92468d0))

# [0.28.0](https://github.com/zrebec/minefield/compare/v0.27.0...v0.28.0) (2026-06-18)


### Features

* **gems:** data-driven colour kinds + HUD backpack inventory ([5e8ccf2](https://github.com/zrebec/minefield/commit/5e8ccf291567355603fc8b92128297a616507559))

# [0.27.0](https://github.com/zrebec/minefield/compare/v0.26.0...v0.27.0) (2026-06-18)


### Features

* **spawn:** seed the vertical start row (random per field, fair per seed) ([e1f9623](https://github.com/zrebec/minefield/commit/e1f9623a35469670694e1a848cc8a88a5d976ac1))

# [0.26.0](https://github.com/zrebec/minefield/compare/v0.25.0...v0.26.0) (2026-06-18)


### Features

* **hud:** expand status bar to 3 rows, shrink playfield to 21 ([14b7e7e](https://github.com/zrebec/minefield/commit/14b7e7e8352f8856086c551c4661f72c6eea5f67))

# [0.25.0](https://github.com/zrebec/minefield/compare/v0.24.0...v0.25.0) (2026-06-17)


### Features

* **hud:** mine-detector — split immediate vs ranged danger ([1e62101](https://github.com/zrebec/minefield/commit/1e621014eb9fe96db8e1196b59b874c85a18352b))

# [0.24.0](https://github.com/zrebec/minefield/compare/v0.23.0...v0.24.0) (2026-06-16)


### Features

* **input:** D toggles debug, R rerolls a random (non-daily) field ([ff9954f](https://github.com/zrebec/minefield/commit/ff9954fed0f59e6d1d99963d65576b2df7986cc0))

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
