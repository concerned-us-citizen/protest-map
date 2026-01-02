import fs from "fs";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { config } from "./config";

dotenv.config();

const OWNER = "concerned-us-citizen";
const REPO = "protest-map";
const TAG = "build-artifacts-v1"; // Versioned tag
const GH_RELEASE_TOKEN = process.env.GH_RELEASE_TOKEN;

if (!GH_RELEASE_TOKEN) {
  throw new Error("Missing GH_RELEASE_TOKEN in environment");
}

const octokit = new Octokit({ auth: GH_RELEASE_TOKEN });

async function ensureRelease() {
  try {
    await octokit.repos.getReleaseByTag({ owner: OWNER, repo: REPO, tag: TAG });
  } catch (err) {
    // Type guard to check if error has status property (Octokit errors)
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      err.status === 404
    ) {
      await octokit.repos.createRelease({
        owner: OWNER,
        repo: REPO,
        tag_name: TAG,
        name: `Cache Release ${TAG}`,
        draft: false,
        prerelease: false,
      });
    } else {
      throw err;
    }
  }
}

async function uploadFile(filePath: string, nameOnRelease: string) {
  const fileContent = fs.readFileSync(filePath);
  const stat = fs.statSync(filePath);

  const existingAssets = await octokit.repos.listReleaseAssets({
    owner: OWNER,
    repo: REPO,
    release_id: (
      await octokit.repos.getReleaseByTag({
        owner: OWNER,
        repo: REPO,
        tag: TAG,
      })
    ).data.id,
  });

  const existing = existingAssets.data.find((a) => a.name === nameOnRelease);
  if (existing) {
    const remoteDate = new Date(existing.updated_at).getTime();
    const localDate = stat.mtime.getTime();
    if (remoteDate >= localDate) {
      console.log(
        `🟡 Remote ${nameOnRelease} is newer or equal, skipping upload`
      );
      return;
    }
    await octokit.repos.deleteReleaseAsset({
      owner: OWNER,
      repo: REPO,
      asset_id: existing.id,
    });
    console.log(`🗑 Deleted old asset: ${nameOnRelease}`);
  }

  const release = await octokit.repos.getReleaseByTag({
    owner: OWNER,
    repo: REPO,
    tag: TAG,
  });
  await octokit.repos.uploadReleaseAsset({
    owner: OWNER,
    repo: REPO,
    release_id: release.data.id,
    name: nameOnRelease,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: fileContent as any, // TS issue workaround
  });

  console.log(`✅ Uploaded ${nameOnRelease}`);
}

async function downloadFile(nameOnRelease: string, outputPath: string) {
  const release = await octokit.repos.getReleaseByTag({
    owner: OWNER,
    repo: REPO,
    tag: TAG,
  });
  const asset = release.data.assets.find((a) => a.name === nameOnRelease);
  if (!asset) {
    console.log(`⚠️ No asset named ${nameOnRelease} found on release`);
    return;
  }

  const res = await fetch(asset.browser_download_url, {
    headers: { Authorization: `token ${GH_RELEASE_TOKEN}` },
  });

  if (!res.ok)
    throw new Error(`Failed to download ${nameOnRelease}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, fileBuffer);
  console.log(`⬇️ Downloaded ${nameOnRelease} to ${outputPath}`);
}

// CLI interface
const [, , cmd] = process.argv;
(async () => {
  await ensureRelease();

  switch (cmd) {
    case "upload-cache":
      await uploadFile(
        config.paths.buildLocationCache,
        "cached-location-data.sqlite"
      );
      break;
    case "download-cache":
      await downloadFile(
        "cached-location-data.sqlite",
        config.paths.buildLocationCache
      );
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
})();
