'use server';

import { sleep } from '@lab/core';
import { revalidatePath } from 'next/cache';

/**
 * A Server Action.
 *
 * 'use server' does NOT mean "this file runs on the server" — everything runs on
 * the server by default. It means "expose these functions as callable RPC
 * endpoints". That is a security statement: every exported function here is a
 * public POST endpoint, so you MUST authorize and validate inside it. Treat the
 * arguments as hostile — they are.
 *
 * `useActionState` (below, in the client component) expects the
 * (previousState, formData) signature and gives you `isPending` for free.
 */

export interface SubscribeState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function subscribe(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  // 1. Authorize here (session/role). Never rely on the UI having hidden a button.
  // 2. Validate here. In a real app this is a zod/valibot schema.
  const email = String(formData.get('email') ?? '').trim();
  if (!EMAIL.test(email)) {
    return { status: 'error', message: 'That does not look like an email address.' };
  }

  await sleep(600); // pretend to write to a database

  // Tell the router the cached render of this path is stale.
  // revalidateTag() is the finer-grained alternative when you tagged the fetch.
  revalidatePath('/actions');

  return { status: 'success', message: `Subscribed ${email}.` };
}
