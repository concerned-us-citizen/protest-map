<script lang="ts">
  import {
    issueTypeInfos,
    type IssueType,
    type ScrapeIssue,
  } from "$lib/stats/types";

  const props = $props<{
    issues: ScrapeIssue[];
  }>();
  const { issues } = props;

  let rejectCount = $state(0);
  let warningCount = $state(0);

  $effect(() => {
    rejectCount = 0;
    warningCount = 0;
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      if (issueTypeInfos[issue.type as IssueType].rejected) {
        rejectCount++;
      } else {
        warningCount++;
      }
    }
  });
</script>

<div class="issue-badges">
  {#if rejectCount > 0}
    <div class="reject-count" title="Rejected rows">{rejectCount}</div>
  {/if}
  {#if warningCount > 0}
    <div class="warning-count" title="Adjusted rows">{warningCount}</div>
  {/if}
</div>

<style>
  .issue-badges {
    display: flex;
    flex-direction: row;
    gap: 0.2rem;
    flex-wrap: nowrap;
  }
  .warning-count,
  .reject-count {
    overflow: hidden;
    border-radius: 0.3rem;
    padding: 0.2rem 0.2rem;
    font-size: 0.7rem;
  }

  .reject-count {
    color: #fefefe;
    background-color: var(--color-red);
  }

  .warning-count {
    color: #202020;
    background-color: var(--color-unavailable);
  }
</style>
