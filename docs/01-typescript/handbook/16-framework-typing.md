# 16. Framework typing

Typing that shows up in the four apps in this repo. The type system is the same; the
idioms differ.

## 16.1 React

### Component props

```tsx
type ButtonProps = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost';
  children?: React.ReactNode;
};

function Button({ label, onClick, variant = 'primary' }: ButtonProps) { … }
```

Do **not** use `React.FC` in new code: it adds an implicit `children`, complicates
generics, and gives nothing back. A plain function with typed props is better.

Extending native element props — the pattern for design-system components:

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'ghost';
};

function Button({ variant = 'primary', ...rest }: ButtonProps) {
  return <button {...rest} data-variant={variant} />;
}

// with a ref
type InputProps = React.ComponentPropsWithRef<'input'> & { label: string };

// props of another component
type Props = React.ComponentProps<typeof SomeComponent>;
```

### Generic components

```tsx
type SelectProps<T> = {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  getKey: (value: T) => string;
  renderOption?: (value: T) => React.ReactNode;
};

function Select<T>({ options, value, onChange, getKey }: SelectProps<T>) { … }

<Select
  options={products}
  value={selected}
  onChange={(p) => setSelected(p)}   // p: Product, inferred ✓
  getKey={(p) => p.id}
/>;
```

Because `T` appears in several props, the compiler forces them to agree — which is the
bug this pattern removes. In a `.tsx` file, a lone `<T>` is parsed as JSX; write
`<T,>` or `<T extends unknown>` for arrow functions.

### Hooks

```tsx
// useState — annotate when the initial value does not determine the type
const [user, setUser] = useState<User | null>(null);
const [count, setCount] = useState(0);              // number, inferred
const [items, setItems] = useState<Product[]>([]);  // [] would infer never[]

// useRef — three distinct shapes
const inputRef = useRef<HTMLInputElement>(null);       // RefObject, readonly .current
const timer = useRef<ReturnType<typeof setTimeout>>(); // MutableRefObject | undefined
const count2 = useRef<number>(0);                       // MutableRefObject<number>

// useReducer — the discriminated-union payoff
type State = { items: Product[]; filter: string };
type Action =
  | { type: 'add'; product: Product }
  | { type: 'filter'; value: string }
  | { type: 'clear' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':    return { ...state, items: [...state.items, action.product] };
    case 'filter': return { ...state, filter: action.value };
    case 'clear':  return { ...state, items: [] };
    default:       return assertNever(action);
  }
}
const [state, dispatch] = useReducer(reducer, { items: [], filter: '' });
dispatch({ type: 'add', product });   // ✓ payload checked per variant

// useContext — the "no default" idiom
const AuthContext = createContext<AuthValue | null>(null);
function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;   // non-null for every consumer, without `!`
}
```

### Custom hooks — return a tuple or an object, deliberately

```ts
// tuple: callers rename freely — needs an explicit annotation or `as const`
function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  return [on, useCallback(() => setOn((v) => !v), [])];
}

// object: better past two values, self-documenting at the call site
function useAbortableSearch<T>(query: string, fetcher: (q: string, s: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<RemoteData<T>>({ status: 'idle' });
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetcher(query, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      });
    return () => controller.abort();   // cleanup cancels the in-flight request
  }, [query, fetcher]);
  return state;
}
```

`RemoteData<T>` in the return type means consumers must handle every state — which is
the whole point (`apps/react-lab/src/hooks/useAbortableSearch.ts`).

### Events

```tsx
function Form() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.value;
  const onKey    = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter';
  const onClick  = (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.name;
  …
}
```

`e.target` is the element that fired; `e.currentTarget` is the element the handler is
attached to and is the one with the useful type. Prefer `currentTarget`.

### `useSyncExternalStore`

```ts
function useStore<S, R>(store: Store<S>, selector: (s: S) => R): R {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),   // server snapshot
  );
}
```

The selector's return type flows out; that is all a state library is.

---

## 16.2 Angular (standalone, signals, zoneless)

```ts
@Component({
  selector: 'app-product-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `…`,
})
export class ProductTableComponent {
  // typed inputs/outputs — the signal-based API
  readonly products = input.required<readonly Product[]>();
  readonly pageSize = input(20);                       // number, inferred
  readonly selected = output<Product>();

  // writable state
  readonly sortKey = signal<keyof Product>('name');
  readonly filter = signal('');

  // derived state — the type is inferred through the whole graph
  readonly visible = computed<readonly Product[]>(() => {
    const f = this.filter().toLowerCase();
    return this.products()
      .filter((p) => p.name.toLowerCase().includes(f))
      .toSorted((a, b) => String(a[this.sortKey()]).localeCompare(String(b[this.sortKey()])));
  });

  // DI without a constructor
  private readonly http = inject(HttpClient);
}
```

Signal types to know:

```ts
WritableSignal<T>   // signal()
Signal<T>           // computed(), input() — read-only
InputSignal<T>            // input()
InputSignalWithTransform<T, U>   // input({ transform })
ModelSignal<T>            // model() — two-way
OutputEmitterRef<T>       // output()
ResourceRef<T>            // resource()
```

`resource()` returns a status union — the Angular equivalent of `RemoteData`:

```ts
readonly results = resource({
  request: () => ({ query: this.query() }),
  loader: ({ request, abortSignal }) => search(request.query, abortSignal),
});
// results.value(): T | undefined
// results.status(): 'idle' | 'loading' | 'resolved' | 'error' | …
// results.error(): unknown
```

Template type checking is a compiler feature, not a runtime one:

```jsonc
{ "angularCompilerOptions": { "strictTemplates": true, "strictNullInputTypes": true } }
```

`strictTemplates` is what makes `[products]="notAnArray"` a build error. Turn it on.

### The React↔Angular translation, in types

| React | Angular |
|---|---|
| `useState<T>` | `signal<T>()` → `WritableSignal<T>` |
| `useMemo` | `computed()` → `Signal<T>` |
| `useEffect` | `effect()` |
| props | `input<T>()` / `input.required<T>()` |
| callback props | `output<T>()` |
| `useContext` | `inject(Token)` |
| `useSyncExternalStore` | `toSignal(observable$)` |

---

## 16.3 Node and Express

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// generics: <Params, ResBody, ReqBody, Query>
type CreateUserHandler = RequestHandler<
  { orgId: string },        // req.params
  { id: string },           // res.json()
  { name: string },         // req.body
  { dryRun?: string }       // req.query
>;

const createUser: CreateUserHandler = (req, res) => {
  req.params.orgId;   // string ✓
  req.body.name;      // string ✓
  res.json({ id: '1' });
};
```

Adding `user` to `Request` — the canonical module augmentation:

```ts
// types/express.d.ts
import 'express';
declare module 'express-serve-static-core' {
  interface Request { user?: { id: string; roles: readonly string[] } }
}
```

Typed `process.env`:

```ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;          // always a string — parse it at the edge
      DATABASE_URL: string;
    }
  }
}
export {};
```

Error middleware has a four-argument signature that Express detects by arity:

```ts
const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;
  res.status(status).json({ message: err instanceof Error ? err.message : 'Unknown' });
};
```

---

## 16.4 NestJS

Nest leans on legacy decorators plus `emitDecoratorMetadata`, so it needs:

```jsonc
{ "compilerOptions": { "experimentalDecorators": true, "emitDecoratorMetadata": true } }
```

```ts
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly service: ProductsService) {}   // parameter property = DI

  @Get()
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(LoggingInterceptor)
  findAll(@Query() query: QueryProductsDto): Promise<Product[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.service.findOne(id);
  }
}
```

DTOs are **classes, not interfaces** — because `class-validator` reads decorator
metadata at runtime, and interfaces are erased:

```ts
export class QueryProductsDto {
  @IsOptional() @IsString()
  readonly search?: string;

  @IsOptional() @IsIn(['laptops', 'phones', 'audio', 'wearables'])
  readonly category?: Category;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  readonly page?: number = 1;
}
```

`@Type(() => Number)` is required because query strings arrive as strings — a good
illustration of the gap between the *declared* type and the *runtime* value at a
boundary. The validation pipe is what closes it:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

Typed guards, interceptors and filters:

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    return req.header('x-api-key') === process.env.API_KEY;
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    return next.handle().pipe(tap(() => console.log(Date.now() - start)));
  }
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void { … }
}
```

---

## 16.5 Next.js App Router

```tsx
// server component — async by default, runs on the server only
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;              // Promise since Next 15
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  return <ProductView product={product} />;
}

// route handler
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json(await getProduct(id));
}

// server action
'use server';
export async function updateProduct(formData: FormData): Promise<void> {
  const name = formData.get('name');
  if (typeof name !== 'string') throw new Error('bad input');   // FormData is untyped
  …
}
```

The type-level thing to internalise: **anything crossing the server/client boundary
must be serialisable**, and TypeScript does not check that for you. Functions, `Date`
in some configurations, class instances and `Symbol` will fail at runtime with types
that compiled fine. Keep boundary types to plain data.

---

## 16.6 Testing

```ts
import { describe, it, expect, vi } from 'vitest';

// typed mocks
const fetcher = vi.fn<(q: string) => Promise<Product[]>>();
fetcher.mockResolvedValue([]);

// mocking a module keeps the real types
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, fetchProducts: vi.fn() };
});

// type-level assertions live alongside runtime ones
import { expectTypeOf } from 'vitest';

it('preserves the argument tuple', () => {
  expectTypeOf(debounce((a: string, b: number) => {}, 10))
    .toEqualTypeOf<(a: string, b: number) => void>();
});
```

`expectTypeOf` / `assertType` (Vitest) and `tsd` are how you unit-test types. The
`@ts-expect-error` harness used by this handbook's example files is the zero-dependency
version of the same idea.

**Next:** [17. Exercises →](17-exercises.md)
