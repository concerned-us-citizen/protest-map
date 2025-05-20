import type { Load } from "@sveltejs/kit";

import type { ProtestEventDataJson } from "$lib/types";

export const prerender = true;

export const load: Load = async ({
  fetch,
}): Promise<{ data: ProtestEventDataJson }> => {
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
};
