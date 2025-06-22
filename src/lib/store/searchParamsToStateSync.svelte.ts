import { VoterLeanValues } from "$lib/types";
import { deserializeDate, isFutureDate, serializeDate } from "$lib/util/date";
import { quote, toTitleCase } from "$lib/util/string";
import { PageState } from "./PageState.svelte";
import { prettifyNamedRegion, type NamedRegion } from "./RegionModel";

export interface ParamOption<T = string | number | boolean | Date> {
  formTitle: string | ((_pageState: PageState) => string);
  paramName: string | ((_pageState: PageState) => string);
  type: "date" | "string" | "boolean" | "number";
  /**
   * Return the value to include in the URL for this option.
   * Return undefined (or null/empty) to omit this option altogether.
   */
  getValue: (_pageState: PageState) => T | undefined | null | "";
  setValue: (_params: URLSearchParams, _pageState: PageState) => Promise<void>;
}

export const shareOptions: ParamOption[] = [
  {
    formTitle: (pageState) => {
      return `Restrict to Date ${pageState.filter.formattedCurrentDate}`;
    },
    paramName: "date",
    type: "date",
    getValue: (pageState) => pageState.filter.currentDate,
    setValue: async (params, pageState) => {
      const dateStr = params.get("date");
      const date = dateStr ? deserializeDate(dateStr) : undefined;
      if (date && pageState.eventModel.isValidDate(date)) {
        pageState.filter.setCurrentDate(date);
      } else {
        // If not specified, initialize currentDateIndex to be the date at or after the current system date
        // (or - 1 if no match) any time the eventModel's items change
        pageState.filter.currentDateIndex =
          pageState.eventModel.allDatesWithEventCounts.findIndex((dc) =>
            isFutureDate(dc.date, true)
          );
      }
    },
  },
  {
    formTitle: (pageState) => {
      return `Restrict to ${pageState.filter.namedRegion ? prettifyNamedRegion(pageState.filter.namedRegion) : "Unknown"}`;
    },
    paramName: (pageState) => {
      return pageState.filter.namedRegion
        ? pageState.filter.namedRegion.type
        : "region";
    },
    type: "string",
    getValue: (pageState) => pageState.filter.namedRegion?.name,
    setValue: async (params, pageState) => {
      const zoomParams: [
        string,
        (_val: string) => Promise<NamedRegion | undefined>,
      ][] = [
        ["zip", pageState.regionModel.getNamedRegionForZip],
        ["state", pageState.regionModel.getNamedRegionForState],
        ["city", pageState.regionModel.getNamedRegionForCity],
        ["zoomto", pageState.regionModel.getNamedRegionForName],
      ];
      for (const [key, lookupFn] of zoomParams) {
        const value = params.get(key);
        if (!value) continue;

        const namedRegion = await lookupFn.call(pageState.regionModel, value);
        if (namedRegion) {
          if (namedRegion.type === "state") {
            pageState.filter.namedRegion = namedRegion;
          }
          pageState.mapModel.navigateTo(namedRegion, true);
          break;
        } else {
          console.warn(`Could not find region bounds for ${key} = ${value}`);
        }
      }
    },
  },
  {
    formTitle: (pageState) => {
      return `Restrict to events ${pageState.filter.selectedEventNames.map(quote).join(", ")}`;
    },
    paramName: "eventNames",
    type: "string",
    getValue: (pageState) => {
      return pageState.filter.selectedEventNames.length > 0
        ? pageState.filter.selectedEventNames.join("|")
        : undefined;
    },
    setValue: async (params, pageState) => {
      const eventNames = params.get("eventNames");
      if (eventNames) {
        const eventNameList = eventNames.split("|");
        pageState.filter.selectedEventNames = eventNameList;
      }
    },
  },
  {
    formTitle: (pageState) => {
      return `Restrict to protests with voter leans ${pageState.filter.selectedVoterLeans.map(toTitleCase).map(quote).join(" and ")}`;
    },
    paramName: "voterleans",
    type: "string",
    getValue: (pageState) => {
      return pageState.filter.selectedVoterLeans.length > 0
        ? pageState.filter.selectedVoterLeans.join("|")
        : undefined;
    },
    setValue: async (params, pageState) => {
      const voterLeans = params.get("voterleans");
      if (voterLeans) {
        const voterLeanList = voterLeans.split("|").map((s) => s.toLowerCase());
        if (voterLeanList.every((lean) => VoterLeanValues.includes(lean))) {
          pageState.filter.selectedVoterLeans = voterLeanList;
        }
      }
    },
  },
  {
    formTitle: "Animate Immediately",
    paramName: "autoplay",
    type: "boolean",
    getValue: (pageState) => (pageState.autoplaying ? true : undefined),
    setValue: async (params, pageState) => {
      const autoplay = params.get("autoplay");
      if (autoplay) {
        pageState.autoplaying = autoplay === "1";
      }
    },
  },
];

function serializeValue(type: ParamOption["type"], v: unknown): string {
  switch (type) {
    case "date":
      return serializeDate(v as Date);
    case "boolean":
      return v ? "1" : "0";
    default:
      return String(v);
  }
}

type PageStateThunker = (_pageState: PageState) => string;

function resolveWithPageState(
  v: string | PageStateThunker,
  pageState: PageState
): string {
  return typeof v === "function" ? (v as PageStateThunker)(pageState) : v;
}

export async function setStateFromWindowSearchParams(
  params: URLSearchParams,
  pageState: PageState
) {
  for (const option of shareOptions) {
    await option.setValue(params, pageState);
  }
}

export function getSearchParamsFromState(pageState: PageState) {
  const params = new URLSearchParams();
  for (const option of shareOptions) {
    const paramName = resolveWithPageState(option.paramName, pageState);
    const raw = option.getValue(pageState);
    if (raw) {
      const strValue = serializeValue(option.type, raw);
      params.append(paramName, strValue);
    }
  }
  return params;
}
