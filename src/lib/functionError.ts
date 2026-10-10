// What went wrong with a supabase.functions.invoke() call: the function's own
// JSON { error } message when it sent one, and the HTTP status (undefined when
// the request never got a response, e.g. offline).
export async function readFunctionError(
  invokeError: unknown,
  data: { error?: string } | null | undefined,
  fallback: string,
): Promise<{ message: string; status?: number; code?: string }> {
  let message = data?.error ?? (invokeError as { message?: string } | null)?.message ?? fallback;
  // supabase-js puts the function's response on invokeError.context.
  const context = (invokeError as { context?: Response } | null)?.context;
  const status = context instanceof Response ? context.status : undefined;
  let code = (data as { code?: string } | null | undefined)?.code;
  if (context && typeof context.json === "function") {
    try {
      const body = (await context.json()) as { error?: string; code?: string };
      message = body.error ?? message;
      code = body.code ?? code;
    } catch {
      // not JSON: keep what we have
    }
  }
  return { message, status, code };
}
