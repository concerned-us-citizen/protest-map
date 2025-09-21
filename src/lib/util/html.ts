export async function fetchHtml(
  url: string,
  retries: number = 5,
  baseDelayMs: number = 500
): Promise<string> {
  let attempt = 0;

  while (true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
      return await res.text();
    } catch (err) {
      attempt++;
      if (attempt > retries) {
        throw new Error(
          `Failed to fetch ${url} after ${retries} retries. Last error: ${(err as Error).message}`
        );
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      console.warn(
        `Fetch attempt ${attempt} for ${url} failed: ${(err as Error).message}. Retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
