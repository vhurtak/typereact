import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

/**
 * Zoneless bootstrap — no zone.js in package.json at all.
 *
 * This is the headline Angular change to be able to discuss. Historically Zone.js
 * monkey-patched every async API (setTimeout, addEventListener, XHR…) and ran
 * change detection over the whole component tree after each one. Zoneless drops
 * the patching: a component is only checked when a signal it read changes, when
 * an input changes, when an output/event fires, or when `markForCheck` is called.
 *
 * Practical consequences to mention:
 *   - `mutate`-style state updates no longer get noticed; signals must be replaced.
 *   - Third-party libs that relied on Zone.js auto-detection need `markForCheck`.
 *   - `fakeAsync` in tests keeps working; `NgZone.onStable` does not.
 */
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
}).catch((error: unknown) => console.error(error));
