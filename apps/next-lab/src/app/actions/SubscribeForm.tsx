'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { subscribe, type SubscribeState } from './actions';

/**
 * The client half of a Server Action.
 *
 * Three hooks worth knowing cold:
 *   useActionState  — wires an action to a form and gives back [state, action, isPending]
 *   useFormStatus   — read pending state from a CHILD of the form (note: it only
 *                     works in a child, which is why SubmitButton is its own component)
 *   useOptimistic   — render the expected result before the server confirms
 *
 * Progressive enhancement: because the form's `action` is a real action, this
 * form submits and works before hydration finishes, or with JS disabled.
 */
const INITIAL: SubscribeState = { status: 'idle', message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Subscribing…' : 'Subscribe'}
    </button>
  );
}

export function SubscribeForm() {
  const [state, formAction] = useActionState(subscribe, INITIAL);

  return (
    <form action={formAction}>
      <input name="email" type="email" placeholder="you@example.com" aria-label="Email" required />
      <SubmitButton />
      <p aria-live="polite" className="muted">
        {state.message}
      </p>
    </form>
  );
}
