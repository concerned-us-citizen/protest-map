import { Octokit } from "@octokit/rest";
import { type ProcessingSummary, type RunSummary } from "./ScrapeLogger";
import dotenv from "dotenv";
import crypto from "crypto";
import type { FetchedDataType } from "./types";

dotenv.config();

interface GHInfo {
  token: string | undefined;
  ref: string | undefined;
  runId: string | undefined;
  repoString: string | undefined;
}

async function maybeCreateGhIssue(
  issues: string[],
  summaryInfo: ProcessingSummary,
  ghInfo: GHInfo
) {
  const { token, ref, runId, repoString } = ghInfo;

  if (!token || !ref || !runId || !repoString) {
    throw new Error("Missing required GitHub environment variables");
  }

  const [owner, repo] = repoString.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${repoString}`);
  }

  const runUrl = `https://github.com/${repoString}/actions/runs/${runId}`;

  const octokit = new Octokit({ auth: token });

  const body = `## ⚠️ Issues Found: 
  
The event build encountered the following: 

${issues.map((issue) => `- ${issue}`).join("\n")}

**Full Summary**
\`\`\`ts
  ${JSON.stringify(summaryInfo, null, 2)}
\`\`\`

[View run on GitHub Actions](${runUrl})
`;

  const hashLabel =
    "id-" + crypto.createHash("sha256").update(body).digest("hex");

  const existingIssues = await octokit.paginate(octokit.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    labels: hashLabel,
    per_page: 100,
  });
  if (existingIssues.length > 0) {
    const existing = existingIssues[0];
    console.log(
      `Existing matching issue exists (${existing.html_url}), not duplicating`
    );
  }

  const res = await octokit.issues.create({
    owner,
    repo,
    title: `Event Build Issues for ${ref}`,
    body,
    labels: ["event-build-issue", hashLabel],
  });

  console.log("✅ Created issue:", res.data.html_url);
}

export async function maybeCreateGithubIssue(summaryInfo: ProcessingSummary) {
  const thresholds: Record<
    FetchedDataType,
    { minRowCount: number; maxRejects: number }
  > = {
    event: {
      minRowCount: 10000,
      maxRejects: 1000,
    },
    turnout: {
      minRowCount: 1000,
      maxRejects: 1000,
    },
  };

  const checks: {
    test: (_summary: RunSummary) => boolean;
    message: (_summary: RunSummary) => string;
  }[] = [
    {
      test: (s) => s.skippedSheets.length > 0,
      message: (s) => `${s.fetchedDataType}: Skipped bad tab data`,
    },
    {
      test: (s) => s.unfetchedSheets.length > 0,
      message: (s) => `${s.fetchedDataType}: Failed fetching tab`,
    },
    {
      test: (s) => s.added < thresholds[s.fetchedDataType].minRowCount,
      message: (s) =>
        `${s.fetchedDataType}: Fewer rows than expected (min ${thresholds[s.fetchedDataType].minRowCount}, added ${s.added})`,
    },
    {
      test: (s) => s.rejects > thresholds[s.fetchedDataType].maxRejects,
      message: (s) =>
        `${s.fetchedDataType}: More rejects than expected: (max ${thresholds[s.fetchedDataType].maxRejects}, found ${s.rejects})`,
    },
    {
      test: (s) => s.elapsedSeconds > 60 * 60,
      message: (s) =>
        `${s.fetchedDataType}: Processing took longer than an hour`,
    },
  ];

  const ghInfo: GHInfo = {
    token: process.env.GH_RELEASE_TOKEN,
    ref: process.env.GITHUB_REF_NAME,
    runId: process.env.GITHUB_RUN_ID,
    repoString: process.env.GITHUB_REPOSITORY,
  };

  if (!ghInfo.token || !ghInfo.ref || !ghInfo.runId || !ghInfo.repoString) {
    throw new Error("Missing required GitHub environment variables");
  }

  let issues: string[] = [];
  for (const run of summaryInfo.runs) {
    const runIssues = checks
      .filter((check) => check.test(run))
      .map((check) => check.message(run));
    issues = [...issues, ...runIssues];
  }

  if (issues.length > 0) {
    await maybeCreateGhIssue(issues, summaryInfo, ghInfo);
  }
}
