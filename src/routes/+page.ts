import type { EventData } from "$lib/types";

export const prerender = true;

export async function load({ fetch }): Promise<{ data: EventData }> {
  const res = await fetch("/data/data.json");

  if (!res.ok) {
    console.error(
      "Failed to fetch /data/data.json:",
      res.status,
      res.statusText
    );
    throw new Error(`Failed to fetch /data/data.json: ${res.statusText}`);
  }

  try {
    return await res.json();
  } catch {
    console.error("Invalid JSON in /data/data.json");
    throw new Error("Invalid JSON in /data/data.json");
  }
}
