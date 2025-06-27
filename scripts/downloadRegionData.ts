import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { basename } from "path";
import { pipeline } from "stream/promises";
import https from "https";
import http from "http";

const staticDataDir = "static/data";
const MAX_REDIRECTS = 5;

export async function downloadToStatic(url: string): Promise<void> {
  await mkdir(staticDataDir, { recursive: true });

  const filename = basename(new URL(url).pathname);
  const outputPath = `${staticDataDir}/${filename}`;

  await downloadWithRedirects(url, outputPath);
  console.log(`✅ Downloaded to ${outputPath}`);
}

async function downloadWithRedirects(
  url: string,
  outputPath: string,
  redirectCount = 0
): Promise<void> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Too many redirects for ${url}`);
  }

  const client = url.startsWith("https") ? https : http;
  if (redirectCount === 0) {
    console.log(`Downloading ${url}`);
  }

  await new Promise<void>((resolve, reject) => {
    const request = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Node.js downloader)",
          Accept: "*/*",
        },
      },
      async (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
          const redirectUrl = res.headers.location;
          if (!redirectUrl)
            return reject(
              new Error(`Redirect with no Location header from ${url}`)
            );
          const absoluteUrl = new URL(redirectUrl, url).toString();
          res.destroy(); // close the current stream
          return resolve(
            downloadWithRedirects(absoluteUrl, outputPath, redirectCount + 1)
          );
        }

        if (res.statusCode && res.statusCode >= 400) {
          return reject(
            new Error(`Failed to download ${url}: ${res.statusCode}`)
          );
        }
        console.log(`Downloading to ${outputPath}`);
        const writeStream = createWriteStream(outputPath);
        pipeline(res, writeStream).then(resolve).catch(reject);
      }
    );

    request.on("error", reject);
  });
}
const tag = "v1.0.1";
for (const fileName of [
  `region-names-${tag}.json.gz`,
  `regions-${tag}.sqlite.gz`,
  `regions-lite-${tag}.sqlite.gz`,
]) {
  await downloadToStatic(
    `https://github.com/concerned-us-citizen/us-region-db/releases/download/v1.0.1/${fileName}`
  ).catch((err) => {
    console.error("❌ Download failed:", err);
    process.exit(1);
  });
}
