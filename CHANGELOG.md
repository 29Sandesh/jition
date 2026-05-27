# Changelog

## 1.0.0 (2026-05-27)


### Features

* **notifications:** implement real database activity notifications, sync header unread badge count, and support instant organization onboarding via share URL ([dc7c4fc](https://github.com/29Sandesh/jition/commit/dc7c4fc610a184e3d0cf6dc15ddb8f3e5c524897))
* **tutorial:** implement interactive getting started guide, overhaul help page accordions, and add background prefetching/caching engine ([c88d5e8](https://github.com/29Sandesh/jition/commit/c88d5e80b14bd5991e40e5ce18ae55583b2626d2))


### Bug Fixes

* allow members to update tasks and add backend saving to Planner UI ([9c9f5ab](https://github.com/29Sandesh/jition/commit/9c9f5abadc52e46cff1e795bed9d3afd95ff7d76))
* **chatbot:** improve chatbot responsiveness to be super human-like, brief, and clean of asterisks bolding ([9d648fa](https://github.com/29Sandesh/jition/commit/9d648faa31c2f948165911eaa11d828c5e70bc92))
* global workspace sync across dashboard, tasks, timeline, planner; persist planner rescheduling updates; filter workspace members on planner; make database migrations non-fatal in CI/CD ([aea50c9](https://github.com/29Sandesh/jition/commit/aea50c9c339ac7ec1510ce139c5bb5ae94269ef3))
* map task _id to id and support draft creation on Planner board ([34c104e](https://github.com/29Sandesh/jition/commit/34c104e77a785f4fb10224b7e8379215cb06d12c))
* **notifications:** make real-time notification socket url dynamic for production support, add unread badge, and add a test chime button ([22776a6](https://github.com/29Sandesh/jition/commit/22776a64729830f3e140aa0f7fefc508d5847863))
* retrieve tasks correctly from paginated data and map _id to id in Dashboard UI ([05dbe0d](https://github.com/29Sandesh/jition/commit/05dbe0dd6502a30387ecbfed35467dead3f033e8))
* sidebar settings button navigation and make profile menu dropdown click-based ([a278e68](https://github.com/29Sandesh/jition/commit/a278e6872e6244ce33dd3525369aee3f7f06f7ee))
* truncate task id in dashboard to match tasks page and skip e2e tests until ready ([56d203e](https://github.com/29Sandesh/jition/commit/56d203ec747b439cc13e2414a8bbe90cb582579c))


### Performance Improvements

* **lighthouse:** optimize CSS font imports to links in html head, preconnect Google Fonts, make viewport zoomable, and add ARIA landmarks and color contrast adjustments for AuthPage ([447dd4a](https://github.com/29Sandesh/jition/commit/447dd4aaf09bbc57865614cacb18b0d13e4ec7fa))
