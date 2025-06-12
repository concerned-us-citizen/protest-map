import { formatDateTime } from "../../src/lib/util/date";
import fs from "fs/promises";
import { type DissenterEvent } from "./types";
import { fileExists } from "../../src/lib/util/file";
import { config } from "./config";

const path = config.paths.buildLog;

let loggedIssueCount = 0;

export async function initLog() {
  if (await fileExists(path)) {
    await fs.unlink(path);
  }
  await fs.writeFile(
    path,
    `--- Issue log for run ${formatDateTime(new Date())} ---\n\n`,
    "utf8"
  );
}

export async function logInvalidEvent(event: DissenterEvent, reason: string) {
  await logIssue(`'${event.sheetName}': ${reason}`, event);
}

export async function logDiscardedDuplicate(
  discardedEvent: DissenterEvent,
  existingEvent: DissenterEvent
) {
  await logIssue(
    `'${discardedEvent.sheetName}' duplicates event from sheet '${existingEvent.sheetName}'`,
    discardedEvent
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logInfo(message: string, arg?: any) {
  await logIssue(message, arg, false);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logIssue(message: string, arg?: any, isIssue = true) {
  if (isIssue) {
    loggedIssueCount++;
    warnToConsole(message, arg);
  } else {
    if (arg) {
      console.log(message, arg);
    } else {
      console.log(message);
    }
  }

  const logEntry = `${message} ${arg ? JSON.stringify(arg) : ""}\n`;
  await fs.appendFile(path, logEntry, "utf8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function warnToConsole(str: string, arg?: any) {
  console.warn(`⚠️ ${str}`, arg);
}

export function getLoggedIssueCount() {
  return loggedIssueCount;
}
