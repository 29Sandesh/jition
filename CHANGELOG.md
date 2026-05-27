# Changelog

## 1.0.0 (2026-05-27)


### Features

* implement company search, join-request, and admin requests dashboard routes and endpoints ([a28360b](https://github.com/29Sandesh/jition/commit/a28360bb99df626973026a6185f40dbd0d89655f))
* **notifications:** implement real database activity notifications, sync header unread badge count, and support instant organization onboarding via share URL ([bc7c463](https://github.com/29Sandesh/jition/commit/bc7c46384c22c64ae0954a03bb27d9ceb2c11970))
* **tutorial:** implement interactive getting started guide, overhaul help page accordions, and add background prefetching/caching engine ([465726c](https://github.com/29Sandesh/jition/commit/465726ced51c9ddb095c4d6cdc76d3868a550733))


### Bug Fixes

* allow members to update tasks and add backend saving to Planner UI ([46a32c2](https://github.com/29Sandesh/jition/commit/46a32c2d4342ba1aa5a827cb84812dfac94fd134))
* **chatbot:** improve chatbot responsiveness to be super human-like, brief, and clean of asterisks bolding ([905b46f](https://github.com/29Sandesh/jition/commit/905b46f35b51ff0e7a321f5d46b807481a447385))
* disable state and PKCE in Google OAuth Strategy to prevent 500 session crash ([8104670](https://github.com/29Sandesh/jition/commit/8104670ec4144e44db5dd2727367026996436331))
* global workspace sync across dashboard, tasks, timeline, planner; persist planner rescheduling updates; filter workspace members on planner; make database migrations non-fatal in CI/CD ([0f07936](https://github.com/29Sandesh/jition/commit/0f0793690fa7fa81fdd058f98cdaeb6c86b45277))
* map task _id to id and support draft creation on Planner board ([6581380](https://github.com/29Sandesh/jition/commit/658138075cbd4bd7e27c904111b0ea8279b319f7))
* **notifications:** make real-time notification socket url dynamic for production support, add unread badge, and add a test chime button ([fc5579f](https://github.com/29Sandesh/jition/commit/fc5579f7d7f6b1f4f88d67e4e07c704a530ec3f4))
* **oauth:** always register google and github passport strategies, configure trust proxy in express, and specify proxy: true in strategy options to support secure callback URLs behind reverse proxies ([afff6ed](https://github.com/29Sandesh/jition/commit/afff6edca4a29651662f7423f8ab73943e9811b3))
* resolve string to ObjectId assignment compile error in companies router ([4906c1c](https://github.com/29Sandesh/jition/commit/4906c1cb30f1b55d94408eb3adc41fba7f9f7f2c))
* retrieve tasks correctly from paginated data and map _id to id in Dashboard UI ([8d82d9b](https://github.com/29Sandesh/jition/commit/8d82d9b6d14b231d5c9cd97d084c04d318d21cf7))
* sidebar settings button navigation and make profile menu dropdown click-based ([a5ba926](https://github.com/29Sandesh/jition/commit/a5ba92631d55e3642d9d8bbfa4cd10c9890b41f6))
* truncate task id in dashboard to match tasks page and skip e2e tests until ready ([576d56f](https://github.com/29Sandesh/jition/commit/576d56f5d2d293901968e581225332235d88d75e))


### Performance Improvements

* implement React.lazy code-splitting, inline high-performance SVGs, and defer Material Symbols font preloading to solve Lighthouse bottlenecks ([fd59bf7](https://github.com/29Sandesh/jition/commit/fd59bf7490bb371c9fc17e2377844036e6bb3680))
* **lighthouse:** optimize CSS font imports to links in html head, preconnect Google Fonts, make viewport zoomable, and add ARIA landmarks and color contrast adjustments for AuthPage ([e883cda](https://github.com/29Sandesh/jition/commit/e883cda10f67aefadb0bb1e5add716ba5d5e2080))
