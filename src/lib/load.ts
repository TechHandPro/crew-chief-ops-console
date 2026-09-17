/**
 * Turns a read into a renderable result so pages can show an inline error
 * state (with the system-of-record hint) instead of the route error boundary.
 */
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: unknown };

export async function load<T>(read: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await read };
  } catch (error) {
    return { ok: false, error };
  }
}
