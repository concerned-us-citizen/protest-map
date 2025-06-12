import { z, ZodObject, ZodError } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeParseWithExtraWarnings<T extends ZodObject<any>>(
  schema: T,
  input: unknown
):
  | { success: true; data: z.infer<T>; extras: string[] }
  | { success: false; error: ZodError } {
  const result = schema.safeParse(input);
  if (!result.success) return result;

  const schemaKeys = new Set(Object.keys(schema.shape));
  const inputKeys =
    typeof input === "object" && input !== null
      ? Object.keys(input as Record<string, unknown>)
      : [];

  const extras = inputKeys.filter((k) => !schemaKeys.has(k));

  return { success: true, data: result.data, extras };
}
