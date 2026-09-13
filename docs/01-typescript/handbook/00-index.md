# The TypeScript Handbook (working edition)

A complete, example-first reference for TypeScript 5.x, written for someone who already
writes JavaScript and wants the type system as a *tool*, not as decoration.

Every chapter is standalone. Every claim that says "this does not compile" is either
marked in prose or lives as a `@ts-expect-error` in the companion files under
`docs/01-typescript/examples/`, which are verified by:

```bash
npm run lesson:check
```

If a claim in those files is wrong, `tsc` reports *Unused '@ts-expect-error' directive*
and the check fails. The prose can drift; the examples cannot.

## Chapters

| # | File | What it covers |
|---|---|---|
| 1 | [01-type-system-model.md](01-type-system-model.md) | Erasure, structural typing, types-as-sets, assignability, `any`/`unknown`/`never` |
| 2 | [02-primitives-literals-widening.md](02-primitives-literals-widening.md) | Primitives, literal types, widening/narrowing of declarations, `as const`, enums |
| 3 | [03-objects-interfaces-types.md](03-objects-interfaces-types.md) | Object types, `interface` vs `type`, optional/readonly, index signatures, excess property checks |
| 4 | [04-functions.md](04-functions.md) | Signatures, optional/rest/default params, overloads, `this`, construct signatures, variance |
| 5 | [05-unions-narrowing.md](05-unions-narrowing.md) | Unions, intersections, every narrowing mechanism, type guards, assertion functions, exhaustiveness |
| 6 | [06-generics.md](06-generics.md) | Type parameters, constraints, defaults, inference sites, variadic tuples, generic classes, const type params |
| 7 | [07-conditional-types.md](07-conditional-types.md) | `extends ? :`, `infer`, distributivity, recursion, tail-recursion limits |
| 8 | [08-mapped-template-literal-types.md](08-mapped-template-literal-types.md) | Mapped types, modifiers, key remapping, template literal types, intrinsic string types |
| 9 | [09-utility-types.md](09-utility-types.md) | Every built-in utility type, its implementation, and when it lies to you |
| 10 | [10-classes.md](10-classes.md) | Modifiers, `#private`, abstract, `implements`, generics, mixins, decorators, `override` |
| 11 | [11-modules-declarations.md](11-modules-declarations.md) | ESM/CJS interop, `import type`, `.d.ts`, declaration merging, module augmentation, namespaces |
| 12 | [12-async-iterators.md](12-async-iterators.md) | Promises, `Awaited`, async generators, iterators/iterables, typed event loops, cancellation |
| 13 | [13-tsconfig-compiler.md](13-tsconfig-compiler.md) | Every flag that matters, module resolution, project references, build performance |
| 14 | [14-patterns-recipes.md](14-patterns-recipes.md) | Branded types, `Result`, builders, state machines, DI, opaque types, type-level programming |
| 15 | [15-errors-decoder.md](15-errors-decoder.md) | How to read TS error messages, the 20 you will actually hit, and what to do |
| 16 | [16-framework-typing.md](16-framework-typing.md) | React, Angular signals, Node/Express, NestJS — typing that shows up in this repo |
| 17 | [17-exercises.md](17-exercises.md) | Graded exercises with solutions, from `DeepReadonly` to a typed dotted-path `get` |

## Compiler-verified companions

These are `.ts` files, not prose. They state the same claims as the chapters, but as
code the compiler checks — `@ts-expect-error` for "this must not compile", and
`Expect<Equals<A, B>>` for "this type is exactly that type".

| File | Covers |
|---|---|
| [`../examples/_assert.ts`](../examples/_assert.ts) | The `Equals` / `Expect` harness |
| [`../examples/01-foundations.ts`](../examples/01-foundations.ts) | Chapters 1–5: erasure, structural typing, branding, narrowing, unions, `satisfies` |
| [`../examples/02-generics-conditional.ts`](../examples/02-generics-conditional.ts) | Chapters 6–7: constraints, inference, `infer`, distributivity, recursion, variadic tuples |
| [`../examples/03-mapped-strings-patterns.ts`](../examples/03-mapped-strings-patterns.ts) | Chapters 8–9, 14: mapped types, key remapping, template literals, utility-type traps, brands |

Run them all with `npm run lesson:check`. Two claims in the prose were wrong until
these files caught them — that is the point of having them.

## How to read this

Three passes, not one.

1. **Chapters 1–5** are the actual type system. If you only ever read five chapters,
   read these; everything else is built from them.
2. **Chapters 6–9** are type-level programming. This is where "senior TypeScript"
   lives, and where interview questions cluster.
3. **Chapters 10–17** are the surface area: classes, modules, config, patterns, and
   the framework-specific typing you hit day to day.

## The one-paragraph summary of the whole language

TypeScript is a **structural**, **erased**, **gradually-typed** layer over JavaScript.
Types are sets of values; assignability is subset-ness; `never` is the empty set and
`unknown` is the universal set, while `any` opts out of checking entirely. The type
language is itself a (Turing-complete, purely functional, lazily-evaluated) language
whose values are types: conditional types are its `if`, `infer` is its pattern match,
mapped types are its `map`, and recursion is its loop. Everything advanced — utility
types, `Awaited`, typed routers, ORM query builders — is written in that language.
