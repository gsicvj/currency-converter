# Agent Instructions

Work only in `pwa-version` unless the user explicitly asks for another
platform or integration.

Do not edit `react-native-version`, `flutter-version`, or cross-platform
integration code for routine app work.

For PWA frontend changes, keep edits scoped to the requested UI or behavior,
check performance basics such as stable callbacks, memoization, caching, and
unnecessary re-renders, and verify browser-visible behavior with the PWA
Playwright Chromium tests when relevant.

Use a test-first workflow: add or update the failing test before implementing
behavior, then clean up temporary complexity after the first working iteration.
