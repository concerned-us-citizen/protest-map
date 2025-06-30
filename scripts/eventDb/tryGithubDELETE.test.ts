import { expect, it } from "vitest";
import { ProcessingSummary, RunSummary } from "./ScrapeLogger";
import { maybeCreateGithubIssue } from "./createGithubSummaryIssue";

function createSummaryWithRunProps(
  runProps: Partial<RunSummary>
): ProcessingSummary {
  const baseRun: RunSummary = {
    fetchedDataType: "turnout",
    rowsProcessed: 11962,
    rejects: 892,
    duplicates: 982,
    added: 10088,
    skippedSheets: [],
    elapsedSeconds: 17.88,
    loggedIssues: 1299,
    wikiFetches: 0,
    geocodings: 0,
  };

  return {
    elapsedSeconds: 100,
    runs: [
      {
        ...baseRun,
        ...runProps,
      },
    ],
  };
}

it("DELETETHIS", async () => {
  maybeCreateGithubIssue(createSummaryWithRunProps({ rejects: 100000 }));
  expect(true);
});
