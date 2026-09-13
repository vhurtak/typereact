# 10. Classes

## 10.1 Members and modifiers

```ts
class Account {
  // TS-only visibility, erased at compile time
  public readonly id: string;
  protected balanceCents: number;
  private pin: string;

  // JS-native hard privacy, enforced at runtime
  #secret: string;

  // static
  static instances = 0;
  static readonly CURRENCY = 'EUR';
  static { Account.instances = 0; }   // static initialisation block (ES2022)

  // definite assignment: assigned elsewhere (DI, lifecycle hook)
  private logger!: Logger;

  constructor(id: string, balanceCents: number, pin: string) {
    this.id = id;
    this.balanceCents = balanceCents;
    this.pin = pin;
    this.#secret = pin;
    Account.instances++;
  }

  get balance(): number { return this.balanceCents / 100; }
  set balance(value: number) { this.balanceCents = Math.round(value * 100); }
}
```

### `private` vs `#private`

| | `private` | `#private` |
|---|---|---|
| Enforced by | the compiler | the runtime |
| Visible at runtime | yes (`obj['pin']` works) | no — a SyntaxError outside the class |
| In `JSON.stringify` | yes | no |
| Effect on structural typing | makes the class nominal | makes the class nominal |
| Works with | anything | ES2022 target or downlevel via WeakMap |

```ts
class A { private x = 1; }
const a = new A();
a['x'];         // ✓ compiles (bracket access is the documented escape) and works

class B { #x = 1; }
const b = new B();
// b.#x        // ✗ SyntaxError — truly inaccessible
```

Both make the class **nominal** for assignability, because private declarations are
compared by identity:

```ts
class Dog { private brand!: void; name = 'x' }
class Cat { private brand!: void; name = 'x' }
const d: Dog = new Cat();   // ✗ separate declarations of a private property 'brand'
```

### Parameter properties

A constructor-parameter modifier declares *and* assigns the field. This is the Angular
/ NestJS DI idiom:

```ts
class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly logger: Logger,
  ) {}
  // equivalent to declaring both fields and assigning them
}
```

Note this emits real JavaScript (assignments in the constructor), so it is one of the
few TS-only syntaxes that is not erasure-safe — `erasableSyntaxOnly` (TS 5.8) forbids
it, as does Node's native type stripping.

---

## 10.2 `implements` vs `extends`

```ts
interface Serializable { toJSON(): string }
interface Comparable<T> { compareTo(other: T): number }

class Money implements Serializable, Comparable<Money> {
  constructor(private cents: number) {}
  toJSON(): string { return String(this.cents); }
  compareTo(other: Money): number { return this.cents - other.cents; }
}
```

`implements` is a **check only** — it adds nothing to the type and does not infer
member types:

```ts
interface Handler { handle(e: Event): void }
class H implements Handler {
  handle(e) { }   // ✗ Parameter 'e' implicitly has an 'any' type
                  //   implements does NOT provide contextual typing
}
```

That surprises people coming from other languages. Annotate members explicitly, or use
a `satisfies`-style assignment instead:

```ts
const h = { handle(e: Event) {} } satisfies Handler;
```

`implements` also does not check `private`/`protected` members or the constructor. For
"this class must have this constructor", type the *constructor function*:

```ts
type HandlerCtor = new (config: Config) => Handler;
const C: HandlerCtor = class { constructor(c: Config) {} handle(e: Event) {} };
```

---

## 10.3 Abstract classes

```ts
abstract class Shape {
  abstract readonly kind: string;
  abstract area(): number;

  describe(): string { return `${this.kind}: ${this.area()}`; }   // concrete
}

class Circle extends Shape {
  readonly kind = 'circle';
  constructor(private r: number) { super(); }
  area(): number { return Math.PI * this.r ** 2; }
}

new Shape();   // ✗ Cannot create an instance of an abstract class
```

Typing "a constructor for some subclass" needs `abstract new`:

```ts
type ShapeCtor = abstract new (...args: any[]) => Shape;
function register(ctor: ShapeCtor) {}
register(Shape);    // ✓ only works with `abstract new`
register(Circle);   // ✓
```

---

## 10.4 `override` and `noImplicitOverride`

```ts
class Base { greet(): string { return 'hi'; } }

class Child extends Base {
  override greet(): string { return 'hello'; }   // required when noImplicitOverride is on
  override gret(): string { return 'oops'; }     // ✗ no member named 'gret' in the base
}
```

Without the flag, renaming a base method silently turns overrides into new methods —
a classic refactoring bug. This repo turns it on; `ErrorBoundary.tsx` uses it for
`componentDidCatch`.

---

## 10.5 Generic classes and polymorphic `this`

```ts
class Repository<T extends { id: string }> {
  protected items = new Map<string, T>();

  add(item: T): this { this.items.set(item.id, item); return this; }   // polymorphic this
  find(id: string): T | undefined { return this.items.get(id); }
  findBy<K extends keyof T>(key: K, value: T[K]): T[] {
    return [...this.items.values()].filter((i) => i[key] === value);
  }
}

class UserRepository extends Repository<User> {
  findByEmail(email: string): User[] { return this.findBy('email', email); }
}

new UserRepository().add(user).findByEmail('a@b.c');   // ✓ `add` returned UserRepository
```

Static members cannot reference class type parameters:

```ts
class Box<T> {
  static empty: T;                      // ✗
  static of<U>(v: U): Box<U> { return new Box(v); }   // ✓ its own parameter
  constructor(public value: T) {}
}
```

---

## 10.6 Mixins

The TypeScript mixin pattern: a function taking a constructor and returning a subclass.

```ts
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    touch(): void { this.createdAt = new Date(); }
  };
}

function Serializable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    serialize(): string { return JSON.stringify(this); }
  };
}

class Entity { constructor(public id: string) {} }

const Model = Serializable(Timestamped(Entity));
const m = new Model('1');
m.id; m.createdAt; m.serialize();   // ✓ all three, fully typed
```

Constraints on what the base must provide:

```ts
function Loggable<TBase extends Constructor<{ name: string }>>(Base: TBase) {
  return class extends Base {
    log(): void { console.log(this.name); }   // ✓ name guaranteed by the constraint
  };
}
```

Limitation: a mixin's returned class cannot declare `private`/`protected` members that
the outside must not see, and the inferred type can get unwieldy. Prefer composition
unless you genuinely need the prototype chain.

---

## 10.7 Decorators

Two systems exist. Know which one you are looking at.

**Legacy / experimental decorators** (`experimentalDecorators: true`) — what Angular
and NestJS use, plus `emitDecoratorMetadata` for `design:type` reflection:

```ts
// nest-api style
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string): Promise<Product> {
    return this.service.findOne(id);
  }
}
```

**Standard decorators (TS 5.0, TC39 stage 3)** — no config flag, different signatures,
no parameter decorators, no metadata emit (that is a separate proposal):

```ts
function logged<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): Return {
    console.log(`→ ${name}`, args);
    const result = target.call(this, ...args);
    console.log(`← ${name}`, result);
    return result;
  };
}

class Calc {
  @logged
  add(a: number, b: number): number { return a + b; }
}
```

The context object varies by kind: `ClassDecoratorContext`,
`ClassMethodDecoratorContext`, `ClassGetterDecoratorContext`,
`ClassFieldDecoratorContext`, `ClassAccessorDecoratorContext`. They all carry
`kind`, `name`, `static`, `private`, `addInitializer`, and `metadata`.

The two systems are mutually exclusive per project. Angular/Nest are on legacy until
they migrate; do not mix.

---

## 10.8 Classes as types vs values

```ts
class Point { constructor(public x: number, public y: number) {} }

type Instance = Point;          // instance type: { x: number; y: number }
type Ctor = typeof Point;       // constructor: new (x: number, y: number) => Point
type Args = ConstructorParameters<typeof Point>;   // [x: number, y: number]
type Inst = InstanceType<typeof Point>;            // Point

function factory<C extends new (...a: any[]) => any>(
  ctor: C, ...args: ConstructorParameters<C>
): InstanceType<C> {
  return new ctor(...args);
}
const p = factory(Point, 1, 2);   // Point ✓, arguments checked ✓
```

Because classes are structural, an object literal can satisfy a class type:

```ts
const fake: Point = { x: 1, y: 2 };   // ✓ (no private members to block it)
```

That is useful in tests, and a reason to add a `#brand` when you need real identity.

---

## 10.9 When not to use a class

In a React/functional codebase, most "classes" are better as:

```ts
// a closure
function createCounter(initial = 0) {
  let value = initial;
  return {
    get: () => value,
    inc: () => { value++; },
  };
}
type Counter = ReturnType<typeof createCounter>;   // derive the type, don't write it

// a discriminated union + pure functions (see ch. 5)
// a plain object of functions with an explicit state parameter
```

Classes earn their place when you need: DI with decorators (Angular/Nest), `instanceof`
checks, inheritance the framework demands (React `ErrorBoundary`), or genuine private
runtime state with `#`.

**Next:** [11. Modules and declaration files →](11-modules-declarations.md)
