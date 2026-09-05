import { SubscribeForm } from './SubscribeForm';

export const metadata = { title: 'Server actions' };

export default function ActionsPage() {
  return (
    <section className="card">
      <h2>Server Actions — mutations without an API route</h2>
      <p className="muted">
        The form below posts to a function, not a URL. Validation and authorization live in{' '}
        <code>actions.ts</code>, on the server, where a client cannot skip them.
      </p>
      <SubscribeForm />
      <p className="muted">
        Interview trap: &quot;is a Server Action just an API route?&quot; — it compiles to a POST to
        the same route with an action id, so yes at the transport level, but it is not a public
        contract, it is not versioned, and it participates in the router cache
        (<code>revalidatePath</code>) which a fetch to <code>/api</code> does not.
      </p>
    </section>
  );
}
