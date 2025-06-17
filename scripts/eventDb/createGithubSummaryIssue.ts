import { Octokit } from "@octokit/rest";
import { SummaryInfo } from "./types";
import dotenv from "dotenv";

dotenv.config();

async function createGhIssue(issues: string[], summaryInfo: SummaryInfo) {
  const token = process.env.GH_RELEASE_TOKEN;
  const ref = process.env.GITHUB_REF_NAME;
  const runId = process.env.GITHUB_RUN_ID;
  const repoString = process.env.GITHUB_REPOSITORY;

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

  const res = await octokit.issues.create({
    owner,
    repo,
    title: `Event Build Issues for ${ref}`,
    body,
    labels: ["event-build-issue"],
  });

  console.log("✅ Created issue:", res.data.html_url);
}

export async function maybeCreateGithubIssue(summaryInfo: SummaryInfo) {
  const minimumEventCount = 10000;
  const maxRejects = 982;

  const checks: {
    test: (_summary: SummaryInfo) => boolean;
    message: (_summary: SummaryInfo) => string;
  }[] = [
    {
      test: (s) => s.skippedSheets.length > 0,
      message: () => "Skipped bad tab data",
    },
    {
      test: (s) => s.added < minimumEventCount,
      message: (s) =>
        `Fewer events than expected (min ${minimumEventCount}, added ${s.added})`,
    },
    {
      test: (s) => s.rejects > maxRejects,
      message: (s) =>
        `More rejects than expected: (max ${maxRejects}, found ${s.rejects})`,
    },
    {
      test: (s) => s.elapsedSeconds > 60 * 60,
      message: () => "Processing took longer than an hour",
    },
  ];

  const issues = checks
    .filter((check) => check.test(summaryInfo))
    .map((check) => check.message(summaryInfo));

  if (issues.length > 0) {
    await createGhIssue(issues, summaryInfo);
  }
}
