<script lang="ts">
  import PillButton from "$lib/component/PillButton.svelte";
  import {
    EventRowSchema,
    issueTypeInfos,
    TurnoutRowSchema,
    type FetchedDataType,
    type IssueType,
    type ProcessingSummary,
  } from "$lib/stats/types";
  import { formatAsInteger } from "$lib/util/number";
  import { toTitleCase } from "$lib/util/string";
  import { onMount, tick } from "svelte";
  import { groupByProp } from "$lib/util/misc";
  import { safeCopyToClipboard } from "$lib/util/os";
  import { ClipboardCopy } from "@lucide/svelte";
  import Link from "$lib/component/Link.svelte";
  import IssueBadges from "./IssueBadges.svelte";

  let summary: ProcessingSummary | undefined = $state();
  let selectedRunType: FetchedDataType = $state("event");
  let selectedIssueType: IssueType | "all" = $state("all");
  let selectedSheetName: string | undefined = $state();
  let copiedText: string | undefined = $state();

  let issuesByRunTypeAndSheetName = $derived.by(() => {
    if (!summary) return { event: {}, turnout: {} };
    return {
      event: groupByProp(summary.runs[0].issues, "sheetName"),
      turnout: groupByProp(summary.runs[1].issues, "sheetName"),
    };
  });

  let selectedRun = $derived.by(() =>
    summary?.runs.find((r) => r.fetchedDataType === selectedRunType)
  );

  let issuesGroupedBySheetName = $derived.by(() => {
    if (!selectedRunType) return {};
    return issuesByRunTypeAndSheetName[selectedRunType] ?? {};
  });

  let issuesForSelectedSheetName = $derived.by(() => {
    if (!selectedSheetName) return [];
    return issuesGroupedBySheetName[selectedSheetName] ?? [];
  });

  let issuesForSelectedSheetNameGroupedByType = $derived.by(() => {
    if (!selectedSheetName) return [];
    return groupByProp(issuesForSelectedSheetName, "type");
  });

  let selectedSpreadsheetLink = $derived.by(() => {
    return selectedRunType === "event"
      ? "https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/edit?gid=2111558793#gid=2111558793"
      : "https://docs.google.com/spreadsheets/d/1hQzNbsbupLqtijfQywpmZs6nKSNLmEbugaYl6HWbyvA/edit?gid=1716080084#gid=1716080084";
  });

  let selectedIssues = $derived.by(() => {
    if (!selectedRun || !selectedSheetName) return [];
    return issuesForSelectedSheetName.filter((issue) => {
      return selectedIssueType === "all" || issue.type === selectedIssueType;
    });
  });

  $effect(() => {
    void selectedRunType;
    selectedIssueType = "all";
    selectedSheetName = Object.keys(issuesGroupedBySheetName)[0];
  });

  let netAccepted = $derived.by(() => {
    if (!selectedRun) return 0;
    const run = selectedRun;
    return run.rowsProcessed - run.rejects - run.duplicates;
  });

  let rowStats = $derived.by(() => {
    if (!selectedRun) return [];
    const run = selectedRun;
    return [
      {
        name: "Total Seen",
        value: formatAsInteger(run.totalRows),
      },
      {
        name: "Processed",
        value: formatAsInteger(run.rowsProcessed),
      },
      {
        name: "Issues Found",
        value: formatAsInteger(run.issues.length ?? 0),
      },
      {
        name: "Rejected",
        value: formatAsInteger(run.rejects),
      },
      {
        name: "Duplicates",
        value: formatAsInteger(run.duplicates),
      },
      {
        name: "Net Added",
        value: formatAsInteger(netAccepted),
      },
      {
        name: "Accepted",
        value: `${((netAccepted / (run.totalRows - run.duplicates)) * 100).toFixed(1)}%`,
      },
    ];
  });

  let otherStats = $derived.by(() => {
    if (!selectedRun) return [];
    const run = selectedRun;
    return [
      {
        name: "Wikipedia Lookups",
        value: formatAsInteger(run.wikiFetches),
      },
      {
        name: "Geocodings",
        value: formatAsInteger(run.geocodings),
      },
      {
        name: "Processing Time",
        value: `${run.elapsedSeconds.toFixed(0)}s`,
      },
    ];
  });

  let columns = $derived.by(() => {
    return selectedRunType === "event"
      ? Object.keys(EventRowSchema.shape)
      : Object.keys(TurnoutRowSchema.shape);
  });

  // Example flex config function
  function getColumnWidth(col: string): string {
    const map: Record<string, string> = {
      date: "1fr",
      name: "2fr",
      address: "3fr",
      city: "2fr",
      state: "1fr",
      zip: "1fr",
      link: "3fr",
      coverageUrl: "3fr",
      low: "1fr",
      high: "1fr",
    };
    return map[col] ?? 1;
  }

  function isCopyableColumn(col: string) {
    switch (col) {
      case "name":
      case "address":
      case "city":
      case "link":
      case "coverageUrl":
        return true;
      default:
        return false;
    }
  }

  let gridTemplate = $derived.by(() =>
    columns.map((col) => `${getColumnWidth(col)}`).join(" ")
  );

  onMount(async () => {
    const res = await fetch("/data/processing_summary.json");
    summary = await res.json();
  });

  async function copyToClipboard(text: string) {
    await safeCopyToClipboard(text);
    copiedText = text;

    // Wait a bit, then clear the message
    await tick();
    setTimeout(() => {
      copiedText = undefined;
    }, 2000);
  }
</script>

<svelte:head>
  <title>Map Build Results</title>
  <meta property="og:title" content="Map Build Results" />
  <meta
    property="og:description"
    content="Statistics from the most recent retrieval of data from We (The People) Dissent."
  />
</svelte:head>

<div class="page">
  <h2>Data Import Summary</h2>
  {#if summary}
    <div class="updated">
      Imported: {new Date(summary.runAt).toLocaleString()}
    </div>

    <div class="run-buttons">
      {#each summary.runs as run, _i (run.fetchedDataType)}
        <PillButton
          selected={selectedRunType === run.fetchedDataType}
          onClick={() => (selectedRunType = run.fetchedDataType)}
          >{toTitleCase(run.fetchedDataType)}s</PillButton
        >
      {/each}
    </div>
    <div class="run">
      <div class="stat-container">
        <div class="stat-header">
          {`${toTitleCase(selectedRunType)} Statistics`}
        </div>
        <div class="stats">
          {#each rowStats as rowStat, _i (rowStat.name)}
            <div class="stat">
              <div class="stat-name">{rowStat.name}</div>
              <div class="stat-value">{rowStat.value}</div>
            </div>
          {/each}
        </div>
      </div>

      <div class="stat-container">
        <div class="stat-header">Other</div>
        <div class="stats">
          {#each otherStats as otherStat, _i (otherStat.name)}
            <div class="stat">
              <div class="stat-name">{otherStat.name}</div>
              <div class="stat-value">
                {otherStat.value}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="spreadsheet-link">
        <a href={selectedSpreadsheetLink} target="_blank" rel="noopener"
          >We (The People) Dissent spreadsheet for {selectedRunType}s
        </a>
      </div>

      <div class="sheetname-buttons">
        {#each Object.entries(issuesGroupedBySheetName) as [sheetName, issues] (sheetName)}
          <PillButton
            class="badge-button"
            selected={selectedSheetName === sheetName}
            onClick={() => (selectedSheetName = sheetName)}
          >
            {sheetName}
            <IssueBadges {issues} />
          </PillButton>
        {/each}
      </div>

      <div class="issue-type-buttons">
        <PillButton
          class="badge-button"
          selected={selectedIssueType === "all"}
          onClick={() => (selectedIssueType = "all")}
        >
          All Issues
          <IssueBadges issues={issuesForSelectedSheetName} />
        </PillButton>
        {#each Object.entries(issuesForSelectedSheetNameGroupedByType) as [type, issues] (type)}
          <PillButton
            class="badge-button"
            selected={selectedIssueType === type}
            onClick={() => (selectedIssueType = type as IssueType)}
          >
            {issueTypeInfos[type as IssueType].title}
            <IssueBadges {issues} />
          </PillButton>
        {/each}
      </div>

      <div class="table">
        <div class="header-row" style="grid-template-columns: {gridTemplate};">
          {#each columns as column, _i (column)}
            <div class={["header-cell cell", `header-cell-${column}`]}>
              {toTitleCase(column)}
            </div>
          {/each}
        </div>

        {#each selectedIssues as issue, i (`${issue.type}${i}`)}
          <div class="row" style="grid-template-columns: {gridTemplate}">
            {#each columns as column, _i (column)}
              <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
              {@const cellValue = (issue.item as any)[column] as string}
              <div
                class={["row-cell cell", `row-cell-${column}`]}
                title={cellValue}
              >
                <div class="cell-centering-container">
                  <div class="cell-value">
                    <Link href={cellValue}>{cellValue}</Link>
                  </div>
                  {#if cellValue?.length > 0 && isCopyableColumn(column)}
                    <PillButton
                      onClick={() => copyToClipboard(cellValue)}
                      title={`Copy ${column} to clipboard`}
                      ><ClipboardCopy size="14" /></PillButton
                    >
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          <div
            class={[
              "row-detail",
              issueTypeInfos[issue.type].rejected ? "rejected" : "",
            ]}
          >
            {#if issueTypeInfos[issue.type].rejected}
              Rejected:
            {/if}
            {issueTypeInfos[issue.type].explanation(issue.explanationArg)}
            {#if issue.type === "cityOrState"}
              <a
                style="margin-left: .3rem"
                href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(issue.explanationArg)}`}
                target="_blank"
                rel="noopener">Search Wikipedia</a
              >
            {:else if issue.type === "address"}
              <a
                style="margin-left: .3rem"
                href={`https://duckduckgo.com/?q=${encodeURIComponent(issue.explanationArg)}`}
                target="_blank"
                rel="noopener">Search DuckDuckGo</a
              >
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div>Couldn't load processing summary</div>
  {/if}
</div>

{#if copiedText}
  <div class="copied-popup">Copied '{copiedText}' to clipboard</div>
{/if}

<style>
  .page {
    margin: 0;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
  }

  .updated {
    margin-top: -0.3rem;
    margin-bottom: 0.5rem;
  }

  .run-buttons {
    display: flex;
    justify-content: start;
    gap: 1rem;

    :global(button) {
      font-size: 1.2rem;
    }
  }

  .run {
    width: 100%;
    height: 100%;
  }

  .stat-container {
    background: #f0f0f0;
    padding: 0 0.5rem 0.5rem 0.5rem;
    border-radius: 0.3rem;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .stat-header {
    background: lightgray;
    overflow: hidden;
    font-weight: bold;
    padding: 0.3rem 0 0.3rem 0.3rem;
    margin-left: -0.5rem;
    margin-bottom: 0.5rem;
    margin-right: -0.5rem;
  }

  .stats {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: end;
  }

  .stat-name {
    font-size: 0.9rem;
    font-weight: bold;
    text-align: end;
  }

  .spreadsheet-link {
    text-align: start;
    margin-top: 1rem;
  }

  .sheetname-buttons,
  .issue-type-buttons {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: row;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  :global(.badge-button) {
    padding: 0.5rem !important;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }

  .table {
    margin-top: 0.5rem;
    display: block;
    width: 100%;
  }

  .header-row,
  .row {
    display: grid;
    width: 100%;
    grid-auto-rows: auto;
  }

  .row {
    margin-top: 1rem;
  }

  .header-row .cell {
    font-weight: bold;
  }

  .cell {
    padding: 0.5rem;
    border: 1px solid #ccc;
    display: flex;
    flex-direction: row;
    align-items: start;
    overflow: hidden;
  }

  .cell-centering-container {
    width: 100%;
    overflow: hidden;
  }

  .cell-centering-container :global(button) {
    margin-left: 0.3rem;
  }

  .cell-value {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-cell-link .cell-value,
  .row-cell-coverageUrl .cell-value {
    word-break: break-all;
  }

  .header {
    font-weight: bold;
    background: #f0f0f0;
  }

  .row-detail {
    padding: 0.5rem;
    background: #f0f0f0;
    border-radius: 0 0.3rem 0.3rem 0.3rem;
    grid-column: 1 / -1;
  }

  .row-detail,
  .row-detail a {
    color: #202020;
    background-color: var(--color-unavailable);
  }

  .row-detail.rejected,
  .row-detail.rejected a {
    color: #fefefe;
    background-color: var(--color-red);
  }

  .cell-centering-container * {
    display: inline;
  }

  h2 {
    margin: 0;
  }

  .copied-popup {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.4rem;
    opacity: 0.9;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 999;
  }
</style>
