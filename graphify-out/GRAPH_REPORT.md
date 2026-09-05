# Graph Report - type-react  (2026-09-05)

## Corpus Check
- Corpus is ~19,781 words - fits in a single context window. You may not need a graph.

## Summary
- 719 nodes · 811 edges · 54 communities (36 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.83)
- Token cost: 83,775 input · 0 output

## Community Hubs (Navigation)
- Core Async & API Client
- Angular Lab Components
- Nest API Dependencies
- Angular Framework Packages
- Angular CLI Build Config
- Nest Products Module
- Nest TypeScript Config
- Next Lab Dependencies
- Next TypeScript Config
- Angular TypeScript Config
- Core Table & Data Generation
- Nest Dev Tooling
- React Lab TypeScript Config
- React Testing Tooling
- Core TypeScript Config
- Core Package Manifest
- React Lab Package Manifest
- Monorepo Root Scripts
- Core Emitter & Store
- Nest App Bootstrap & Middleware
- Monorepo Overview & Reactivity Models
- React Rendering & State Concepts
- Next Server Actions Demo
- Angular App TSConfig References
- TypeScript Typing & Design Framework
- Server-Side Rendering & Caching Docs
- Core CJS Build Config
- React Error Boundary
- React Typeahead & Hooks
- Type Safety & Node Internals
- Memoisation, Perf & Pagination
- Race Conditions & Live Coding Drills
- Nest CLI Config
- Nest API Key Guard
- Next Product Detail Page
- Next Products List Page
- React Product Table
- React Store Counter
- Next Search Page
- React Lab App Shell
- Next Products Route Handler
- Next Root Layout
- Next Build Config
- Next Environment Types
- Core CJS Package Script

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `compilerOptions` - 17 edges
3. `compilerOptions` - 16 edges
4. `QueryProductsDto` - 15 edges
5. `compilerOptions` - 15 edges
6. `compilerOptions` - 14 edges
7. `ProductTableComponent` - 11 edges
8. `LruCache` - 10 edges
9. `type-react prep monorepo` - 10 edges
10. `scripts` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Strict tsconfig flags beyond strict` --references--> `packages/core (framework-agnostic logic)`  [EXTRACTED]
  docs/01-typescript/README.md → README.md
- `React Lab HTML shell` --implements--> `apps/react-lab (React 19 + Vite + Vitest)`  [INFERRED]
  apps/react-lab/index.html → README.md
- `Angular Lab HTML shell` --implements--> `apps/angular-lab (Angular 20, standalone, zoneless)`  [INFERRED]
  apps/angular-lab/src/index.html → README.md
- `2026 senior posting signals` --rationale_for--> `apps/next-lab (Next.js 15 App Router)`  [INFERRED]
  docs/README.md → README.md
- `Graceful shutdown and AsyncLocalStorage` --references--> `apps/nest-api (NestJS 11)`  [EXTRACTED]
  docs/04-node/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Four demos built twice on one shared core** — readme_packages_core, readme_apps_react_lab, readme_apps_angular_lab, readme_demo_typeahead, readme_demo_product_table, readme_demo_virtual_list, readme_demo_store_undo_redo [EXTRACTED 1.00]
- **Typeahead race condition across docs and demos** — readme_demo_typeahead, docs_06_live_coding_readme_race_condition, docs_02_react_readme_useeffect_not_lifecycle, docs_03_angular_react_vs_angular_rxjs_flattening, docs_05_system_design_readme_problem_typeahead [EXTRACTED 1.00]
- **Caching reasoning from core utilities to Next.js layers** — docs_05_system_design_readme_caching_layers, docs_04_node_readme_next15_caching_layers, docs_06_live_coding_readme_tier1_vanilla, readme_packages_core [INFERRED 0.85]

## Communities (54 total, 9 thin omitted)

### Community 0 - "Core Async & API Client"
Cohesion: 0.07
Nodes (20): AbortError, fetchProduct(), latencyFor(), SearchOptions, searchProducts(), promisePool(), retry(), RetryOptions (+12 more)

### Community 1 - "Angular Lab Components"
Cohesion: 0.06
Nodes (15): AppComponent, TabKey, Component, ProductTableComponent, Component, history, StoreCounterComponent, Component (+7 more)

### Community 2 - "Nest API Dependencies"
Cohesion: 0.05
Nodes (38): dependencies, class-transformer, class-validator, @lab/core, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata (+30 more)

### Community 3 - "Angular Framework Packages"
Cohesion: 0.05
Nodes (36): @angular/build, @angular/cli, @angular/common, @angular/compiler, @angular/compiler-cli, @angular/core, @angular/forms, @angular/platform-browser (+28 more)

### Community 4 - "Angular CLI Build Config"
Cohesion: 0.06
Nodes (35): architect, prefix, projectType, root, sourceRoot, build, serve, builder (+27 more)

### Community 5 - "Nest Products Module"
Cohesion: 0.11
Nodes (19): ProductsController, ProductsService, Injectable, QueryProductsDto, Controller, Get, Header, IsBoolean (+11 more)

### Community 6 - "Nest TypeScript Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+19 more)

### Community 7 - "Next Lab Dependencies"
Cohesion: 0.07
Nodes (26): dependencies, @lab/core, next, react, react-dom, devDependencies, @types/node, @types/react (+18 more)

### Community 8 - "Next TypeScript Config"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 9 - "Angular TypeScript Config"
Cohesion: 0.08
Nodes (25): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, typeCheckHostBindings, compileOnSave, compilerOptions (+17 more)

### Community 10 - "Core Table & Data Generation"
Cohesion: 0.13
Nodes (20): makeProducts(), mulberry32(), NAMES, PRODUCTS, defaultQuery, filterProducts(), paginate(), runQuery() (+12 more)

### Community 11 - "Nest Dev Tooling"
Cohesion: 0.08
Nodes (25): devDependencies, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing, ts-jest, ts-loader, ts-node (+17 more)

### Community 12 - "React Lab TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+16 more)

### Community 13 - "React Testing Tooling"
Cohesion: 0.09
Nodes (23): devDependencies, jsdom, @testing-library/dom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/react, @types/react-dom (+15 more)

### Community 14 - "Core TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, exactOptionalPropertyTypes, lib, module, moduleResolution, noFallthroughCasesInSwitch, noImplicitOverride (+13 more)

### Community 15 - "Core Package Manifest"
Cohesion: 0.10
Nodes (19): devDependencies, typescript, vitest, exports, typescript, vitest, main, module (+11 more)

### Community 16 - "React Lab Package Manifest"
Cohesion: 0.11
Nodes (18): dependencies, @lab/core, react, react-dom, @lab/core, react, react-dom, name (+10 more)

### Community 17 - "Monorepo Root Scripts"
Cohesion: 0.11
Nodes (18): description, engines, node, name, private, scripts, build:core, dev:angular (+10 more)

### Community 18 - "Core Emitter & Store"
Cohesion: 0.16
Nodes (8): Emitter, EventMap, Unsubscribe, createHistoryStore(), createReducerStore(), createStore(), HistoryState, Store

### Community 19 - "Nest App Bootstrap & Middleware"
Cohesion: 0.18
Nodes (9): AppModule, Module, HttpExceptionFilter, LoggingInterceptor, Injectable, bootstrap(), ProductsModule, Module (+1 more)

### Community 20 - "Monorepo Overview & Reactivity Models"
Cohesion: 0.24
Nodes (12): Angular Lab HTML shell, React Lab HTML shell, Re-render diffing vs signal dependency graph, React 19 to Angular 20 translation table, Zoneless change detection, Problem: design system for many teams, 2026 senior posting signals, The prep kit (docs index) (+4 more)

### Community 21 - "React Rendering & State Concepts"
Cohesion: 0.18
Nodes (11): Context has no selector, Keys as identity claims, Render, reconcile, commit, useEffect as synchronisation, not lifecycle, useSyncExternalStore and tearing, Angular hierarchical DI vs React context, DTO validation with whitelist, NestJS request lifecycle order (+3 more)

### Community 22 - "Next Server Actions Demo"
Cohesion: 0.29
Nodes (5): subscribe(), SubscribeState, metadata, INITIAL, SubscribeForm()

### Community 23 - "Angular App TSConfig References"
Cohesion: 0.22
Nodes (8): compilerOptions, outDir, extends, files, include, ./tsconfig.json, src/**/*.d.ts, src/main.ts

### Community 24 - "TypeScript Typing & Design Framework"
Cohesion: 0.28
Nodes (9): satisfies operator, Three kinds of state (server, URL, client), Graceful shutdown and AsyncLocalStorage, Client-to-CDN caching stack, 45-minute system design framework, Error handling and resilience, How to behave in a live session, Tier 1 vanilla JS/TS drills (+1 more)

### Community 25 - "Server-Side Rendering & Caching Docs"
Cohesion: 0.25
Nodes (9): Reactive forms and ControlValueAccessor, Nest vs Next, when to choose, Next.js four caching layers, Server Actions are public endpoints, 'use client' as a boundary, Problem: checkout / multi-step form, Tier 4 backend drills, apps/nest-api (NestJS 11) (+1 more)

### Community 26 - "Core CJS Build Config"
Cohesion: 0.22
Nodes (8): compilerOptions, declaration, module, moduleResolution, outDir, verbatimModuleSyntax, extends, ./tsconfig.json

### Community 27 - "React Error Boundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 28 - "React Typeahead & Hooks"
Cohesion: 0.46
Nodes (4): renderStatus(), Typeahead(), useAbortableSearch(), useDebouncedValue()

### Community 29 - "Type Safety & Node Internals"
Cohesion: 0.25
Nodes (8): Branded ProductId type, Conditional type distributivity, RemoteData discriminated union, Strict tsconfig flags beyond strict, unknown vs any vs never, Node event loop phases, Streams and backpressure, 4-week prep plan

### Community 30 - "Memoisation, Perf & Pagination"
Cohesion: 0.25
Nodes (8): When to memoise, Ordered React performance checklist, Testing house style (role queries, userEvent), Offset vs cursor pagination, Problem: dashboard with live data, Problem: news feed / infinite scroll, Product table demo, Virtual list demo

### Community 31 - "Race Conditions & Live Coding Drills"
Cohesion: 0.36
Nodes (8): RxJS flattening operators, Problem: typeahead at scale, Drill workflow (blank file, timer, diff), Typeahead race condition, Tier 2 React component drills, Tier 3 Angular equivalents, Typeahead demo, Four twinned demos (React vs Angular)

### Community 32 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 33 - "Nest API Key Guard"
Cohesion: 0.33
Nodes (3): ApiKeyGuard, IS_PUBLIC_KEY, Injectable

### Community 36 - "React Product Table"
Cohesion: 0.50
Nodes (4): Action, COLUMNS, ProductTable(), reducer()

### Community 37 - "React Store Counter"
Cohesion: 0.60
Nodes (3): history, StoreCounter(), useStoreValue()

## Ambiguous Edges - Review These
- `React 19 to Angular 20 translation table` → `Problem: design system for many teams`  [AMBIGUOUS]
  docs/05-system-design/README.md · relation: conceptually_related_to

## Knowledge Gaps
- **307 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `root` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 409 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `React 19 to Angular 20 translation table` and `Problem: design system for many teams`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `devDependencies` connect `Nest Dev Tooling` to `Nest API Dependencies`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `type-react prep monorepo` connect `Monorepo Overview & Reactivity Models` to `TypeScript Typing & Design Framework`, `Server-Side Rendering & Caching Docs`, `Race Conditions & Live Coding Drills`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _307 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Async & API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.06866002214839424 - nodes in this community are weakly interconnected._
- **Should `Angular Lab Components` be split into smaller, more focused modules?**
  _Cohesion score 0.057692307692307696 - nodes in this community are weakly interconnected._
- **Should `Nest API Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._