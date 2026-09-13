# 2. Primitives, literal types, widening

## 2.1 The primitive types

```ts
let s: string;
let n: number;        // all numbers are float64; no int/float distinction
let b: boolean;
let big: bigint;      // 1n, 2n — cannot mix with number
let sym: symbol;
let u: undefined;
let nl: null;
let o: object;        // any non-primitive. Rarely what you want.
```

Use the lowercase forms. The capitalised `String`, `Number`, `Boolean` are the wrapper
*object* types and accept things you do not want:

```ts
const bad: String = new String('x');   // an object, not a primitive
const s2: string = bad;                // ✗ String is not assignable to string
```

`bigint` and `number` do not mix, on purpose:

```ts
const x = 1n + 1;   // ✗ Operator '+' cannot be applied to 'bigint' and 'number'
```

`symbol` vs `unique symbol` — the latter is the type of exactly one symbol, and only
`const` / `readonly static` declarations can have it. It is what makes symbol keys
usable as literal keys:

```ts
const KEY: unique symbol = Symbol('key');
type WithKey = { [KEY]: string };   // requires `unique symbol`
```

---

## 2.2 Literal types

Every primitive value is also a type containing exactly that value.

```ts
type Yes = true;
type Zero = 0;
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Dir = -1 | 0 | 1;
```

Literal unions are the workhorse of good domain modelling — cheap, erased, and they
give autocomplete:

```ts
declare function request(method: Method, url: string): Promise<Response>;
request('GET', '/api');
request('get', '/api');   // ✗ Argument of type '"get"' is not assignable to 'Method'
```

---

## 2.3 Widening: the rule people trip over

When TypeScript infers a type from a literal value, it chooses between the **literal
type** and its **widened base type** based on mutability.

```ts
let a = 'hello';     // string   — `let` can be reassigned, so widen
const b = 'hello';   // 'hello'  — `const` can never change, so keep it exact

let n1 = 0;          // number
const n2 = 0;        // 0
```

Object properties are mutable, so they widen even inside a `const`:

```ts
const obj = { m: 'GET' };     // { m: string }  ← NOT { m: 'GET' }
declare function req(m: 'GET' | 'POST'): void;
req(obj.m);                   // ✗ string is not assignable to 'GET' | 'POST'
```

Four fixes, in increasing order of preference:

```ts
// (1) annotate the property
const o1: { m: 'GET' | 'POST' } = { m: 'GET' };

// (2) assert the single value
const o2 = { m: 'GET' as const };

// (3) freeze the whole literal
const o3 = { m: 'GET' } as const;        // { readonly m: 'GET' }

// (4) satisfies — check the shape, keep the literal types (see 2.6)
const o4 = { m: 'GET' } satisfies { m: 'GET' | 'POST' };
```

Widening also happens through a function's inferred return type, unless the return
position is contextually typed:

```ts
function f() { return 'GET'; }           // () => string
function g(): 'GET' { return 'GET'; }    // () => 'GET'
const h = () => 'GET' as const;          // () => 'GET'
```

### Contextual typing — inference flowing backwards

When a value appears in a position with a known expected type, that type flows *in* and
prevents widening:

```ts
type Method = 'GET' | 'POST';
declare function call(opts: { method: Method }): void;

call({ method: 'GET' });    // ✓ no `as const` needed — contextually typed
```

This is also what types callback parameters for free:

```ts
[1, 2, 3].map((n) => n * 2);          // n: number, inferred from the array
window.addEventListener('click', (e) => e.clientX);   // e: MouseEvent
```

---

## 2.4 `as const` (const assertions)

`as const` does three things to an expression:

1. Literal types are **not widened**.
2. Object properties become `readonly`.
3. Array literals become **readonly tuples**.

```ts
const a1 = ['x', 'y'];             // string[]
const a2 = ['x', 'y'] as const;    // readonly ['x', 'y']

const o1 = { a: 1, b: 'z' };            // { a: number; b: string }
const o2 = { a: 1, b: 'z' } as const;   // { readonly a: 1; readonly b: 'z' }

a2[0] = 'q';    // ✗ Cannot assign to '0' because it is a read-only property
```

It is purely type-level — no `Object.freeze`, nothing at runtime.

### The single most useful `as const` idiom

Derive a union from a runtime array so the two can never drift apart:

```ts
export const CATEGORIES = ['laptops', 'phones', 'audio', 'wearables'] as const;
export type Category = (typeof CATEGORIES)[number];
// 'laptops' | 'phones' | 'audio' | 'wearables'

// One source of truth: iterate at runtime, switch exhaustively at compile time.
CATEGORIES.forEach((c) => render(c));
```

Same trick for objects:

```ts
export const ROLES = { admin: 'admin', user: 'user', guest: 'guest' } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];   // 'admin' | 'user' | 'guest'
```

### `const` type parameters (TS 5.0)

Make a *generic function* preserve literal types without the caller writing `as const`:

```ts
function makeRoute<const T extends readonly string[]>(segments: T): T { return segments; }
const r = makeRoute(['users', 'id']);   // readonly ['users', 'id'], not string[]
```

---

## 2.5 Enums, and why to prefer unions

```ts
enum Direction { Up, Down }                  // numeric enum
enum Method { Get = 'GET', Post = 'POST' }   // string enum
const enum Fast { A = 1 }                    // inlined; breaks isolatedModules
```

Numeric enums emit runtime code, which breaks the "types are erased" model and adds
bundle weight:

```js
// emitted for `enum Level { Low, High }`
var Level;
(function (Level) {
  Level[Level["Low"] = 0] = "Low";
  Level[Level["High"] = 1] = "High";
})(Level || (Level = {}));
```

That object is bidirectional (`Level[0] === 'Low'`), which is rarely wanted and always
paid for.

String enums avoid the reverse mapping but are **nominal**, which surprises people:

```ts
enum Method { Get = 'GET' }
const m: Method = 'GET';     // ✗ '"GET"' is not assignable to 'Method'
```

**Recommended replacement** — as-const object plus derived union. Erasable,
structurally typed, tree-shakeable, no surprises:

```ts
const Method = { Get: 'GET', Post: 'POST' } as const;
type Method = (typeof Method)[keyof typeof Method];   // 'GET' | 'POST'

function send(m: Method) {}
send(Method.Get);   // ✓ namespaced
send('POST');       // ✓ also fine — structural
```

Declaring a `const` and a `type` with the same name is legal and idiomatic: they live in
different declaration spaces — see
[ch. 1](01-type-system-model.md#the-declaration-space-split).

---

## 2.6 `as` vs `:` vs `satisfies`

Three operations people blur together. They are genuinely different.

```ts
const PALETTE = { primary: '#0af', danger: '#f33' };
```

**`as` — a type assertion.** "Trust me." Checked only for plausibility (the two types
must overlap); otherwise it just lies.

```ts
const lie = {} as { primary: string };
lie.primary.toUpperCase();       // compiles, crashes at runtime

const impossible = 'x' as number;         // ✗ neither type sufficiently overlaps
const forced = 'x' as unknown as number;  // ✓ the double-assertion escape hatch
```

**`:` — an annotation.** Checks, but **widens**: the variable's type becomes the
declared type and the specific information is lost.

```ts
const annotated: Record<string, string> = PALETTE;
annotated.anyKeyAtAll;   // string — the key set is gone
```

**`satisfies` (TS 4.9) — check without widening.**

```ts
const palette = {
  primary: '#0af',
  danger: '#f33',
} satisfies Record<string, string>;

palette.primary;    // string ✓
palette.typo;       // ✗ Property 'typo' does not exist
```

The clearest win is heterogeneous values, where `:` would collapse them:

```ts
const config = { port: 3000, host: 'localhost' } satisfies Record<string, string | number>;
config.port.toFixed(2);   // ✓ number — with `:` this would be string | number
```

And exhaustive maps, where you want both the check *and* the exact keys:

```ts
type Category = 'laptops' | 'phones';
const ICONS = {
  laptops: '💻',
  phones: '📱',
} satisfies Record<Category, string>;
// missing a category → error; unknown key → error.
// Note what `satisfies` does NOT do here: the target says `string`, so that is the
// contextual type and the values widen to `string`. To keep the literals, the target
// must be literal-friendly — `satisfies Record<Category, string>` on an `as const`
// object, or a target of `Record<Category, '💻' | '📱'>`.
```

| | checks? | widens? | can lie? |
|---|---|---|---|
| `as T` | barely | n/a | **yes** |
| `: T` | yes | **yes** | no |
| `satisfies T` | yes | no | no |

Rule of thumb: reach for `satisfies` first, `:` on public signatures, `as` almost never
— and when you do, comment why the compiler cannot know.

---

## 2.7 Non-null assertion and definite assignment

```ts
const el = document.getElementById('root')!;   // HTMLElement, not null
```

`!` is `as NonNullable<T>` with nicer syntax — same risk. One or two with a comment is
fine; a scattering means the model is wrong. Prefer:

```ts
const el2 = document.getElementById('root');
if (!el2) throw new Error('#root missing');    // narrows, and fails loudly
```

The definite assignment assertion on a declaration says "I promise this is assigned
before use", for cases the checker cannot see (DI frameworks, test setup):

```ts
class Service {
  private client!: HttpClient;   // assigned in ngOnInit / beforeEach
}
let value!: number;
```

---

## 2.8 Template literal types (preview — full treatment in ch. 8)

String literal types compose:

```ts
type Lang = 'en' | 'de';
type Region = 'US' | 'GB';
type Locale = `${Lang}-${Region}`;   // 'en-US' | 'en-GB' | 'de-US' | 'de-GB'

type EventName<T extends string> = `on${Capitalize<T>}`;
type E = EventName<'click' | 'focus'>;   // 'onClick' | 'onFocus'
```

Note the cross-product: template literal types distribute over every union in every
slot, so they explode combinatorially. TS caps the result at 100,000 members.

**Next:** [3. Objects, interfaces and type aliases →](03-objects-interfaces-types.md)
