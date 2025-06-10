import configJson from "./config.json" with { type: "json" };
import path from "path";
import { Command } from "commander";
import { AppConfig, Paths } from "./configTypes";

function camelCaseKey(dirKey: string, fileKey: string) {
  return dirKey + fileKey[0].toUpperCase() + fileKey.slice(1);
}

const untypedPaths: Record<string, string> = {};

for (const [dirKey, dirPath] of Object.entries(configJson.dirs)) {
  for (const [fileKey, fileName] of Object.entries(configJson.files)) {
    const key = camelCaseKey(dirKey, fileKey);
    untypedPaths[key] = path.join(dirPath as string, fileName as string);
  }
}
const paths = untypedPaths as Paths;

const program = new Command();
program
  .option(
    "--scrape-event-links",
    "Use last fetched raw events instead of scraping"
  )
  .parse(process.argv);
const options = program.opts();

export const config: AppConfig = {
  ...configJson,
  scrapeEventLinks: options.scrapeEventLinks,
  paths,
};
