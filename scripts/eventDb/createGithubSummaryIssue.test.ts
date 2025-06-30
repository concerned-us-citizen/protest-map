import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { maybeCreateGithubIssue } from "./createGithubSummaryIssue";
import { Octokit } from "@octokit/rest";
import type { RunSummary, ProcessingSummary } from "./ScrapeLogger";

vi.mock("@octokit/rest");

const mockCreate = vi.fn();
const mockPaginate = vi.fn();

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

beforeEach(() => {
  // Set required env vars
  process.env.GH_RELEASE_TOKEN = "test-token";
  process.env.GITHUB_REF_NAME = "main";
  process.env.GITHUB_RUN_ID = "123456";
  process.env.GITHUB_REPOSITORY = "testuser/testrepo";

  // Return correct shape from the mocked create() function
  mockCreate.mockResolvedValue({
    data: {
      html_url: "https://github.com/testuser/testrepo/issues/123",
    },
  });

  mockPaginate.mockResolvedValue([]);

  // Replace Octokit constructor
  (Octokit as unknown as Mock).mockImplementation(() => ({
    issues: {
      create: mockCreate,
    },
    paginate: mockPaginate,
  }));

  mockCreate.mockClear();
  mockPaginate.mockClear();
});

afterEach(() => {
  vi.resetModules();
});

describe("maybeCreateGithubIssue", () => {
  it("creates an issue for low added count", async () => {
    const info = createSummaryWithRunProps({
      added: 5000,
      rejects: 100,
      skippedSheets: [],
    });

    await maybeCreateGithubIssue(info);

    expect(mockCreate).toHaveBeenCalledOnce();
    const body = mockCreate.mock.calls[0][0].body;
    expect(body).toContain("Fewer rows than expected");
  });

  it("creates an issue for high rejects", async () => {
    const info = createSummaryWithRunProps({
      added: 12000,
      rejects: 5000,
      skippedSheets: [],
    });

    await maybeCreateGithubIssue(info);

    expect(mockCreate).toHaveBeenCalledOnce();
    const body = mockCreate.mock.calls[0][0].body;
    expect(body).toContain("More rejects than expected");
  });

  it("creates an issue for long script runs", async () => {
    const info = createSummaryWithRunProps({
      elapsedSeconds: 60 * 60 + 1,
    });

    await maybeCreateGithubIssue(info);

    expect(mockCreate).toHaveBeenCalledOnce();
    const body = mockCreate.mock.calls[0][0].body;
    expect(body).toContain("Processing took longer than an hour");
  });

  it("creates an issue for skipped sheets", async () => {
    const info = createSummaryWithRunProps({
      added: 12000,
      rejects: 100,
      skippedSheets: [
        {
          title: "June 14 State Counts",
          rows: 52,
        },
        {
          title: "June 6-13 Protest List",
          rows: 454,
        },
      ],
    });

    await maybeCreateGithubIssue(info);

    expect(mockCreate).toHaveBeenCalledOnce();
    const body = mockCreate.mock.calls[0][0].body;
    expect(body).toContain("Skipped bad tab data");
  });

  it("does not create an issue when all conditions are within threshold", async () => {
    const info = createSummaryWithRunProps({});

    await maybeCreateGithubIssue(info);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws if required env vars are missing", async () => {
    delete process.env.GITHUB_REPOSITORY;

    const info = createSummaryWithRunProps({
      added: 12000,
      rejects: 1000,
      skippedSheets: [],
    });

    await expect(maybeCreateGithubIssue(info)).rejects.toThrow(
      "Missing required GitHub environment variables"
    );
  });
});
