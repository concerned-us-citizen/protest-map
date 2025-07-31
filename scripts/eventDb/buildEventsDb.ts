import fs from "fs/promises";
import { config } from "./config";
import { NodeEventAndTurnoutModel } from "./NodeEventAndTurnoutModel";
import { LocationDataModel } from "./LocationDataModel";
import { ScrapeLogger } from "./ScrapeLogger";
import { loadVotingInfo } from "./votingInfo";
import { processEventDataProps } from "./processEventDataProps";
import { fetchAndProcessData } from "./fetchAndProcessData";
import { processTurnoutDataProps } from "./processTurnoutDataProps";
import { maybeCreateGithubIssue } from "./createGithubSummaryIssue";

async function main() {
  await fs.mkdir(config.dirs.build, { recursive: true });

  const logger = new ScrapeLogger();

  const locationDataModel = await LocationDataModel.create(
    config.paths.buildLocationCache,
    logger
  );

  const eventAndTurnoutModel = await NodeEventAndTurnoutModel.create();

  loadVotingInfo();

  await fetchAndProcessData(
    processEventDataProps,
    eventAndTurnoutModel,
    locationDataModel,
    logger
  );

  await fetchAndProcessData(
    processTurnoutDataProps,
    eventAndTurnoutModel,
    locationDataModel,
    logger
  );

  eventAndTurnoutModel.createSummaries();

  eventAndTurnoutModel.close();
  locationDataModel.close();

  const summary = await logger.close();

  if (process.env.GITHUB_ACTIONS === "true") {
    await maybeCreateGithubIssue(summary);
  }
}

main();
