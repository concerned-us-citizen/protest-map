import {
  VoterLeanValues,
  type MarkerType,
  type TurnoutEstimate,
} from "$lib/types";
import { deserializeDate, serializeDate } from "$lib/util/date";
import { mdItalics, pluralize, toTitleCase } from "$lib/util/string";
import { PageState } from "./PageState.svelte";
import { prettifyNamedRegion, type NamedRegion } from "./RegionModel.svelte";
import { joinWithAnd } from "$lib/util/string";

export interface ParamOption {
  formTitle: (_pageState: PageState) => string;
  paramName: (_pageState: PageState) => string;
  type: "date" | "string" | "boolean" | "number";
  getValue: (_pageState: PageState) => unknown | undefined;
  setValue: (_params: URLSearchParams, _pageState: PageState) => Promise<void>;
  isFilterProp: boolean;
}

export const shareOptions: ParamOption[] = [
  {
    formTitle: (pageState) => {
      return `from ${mdItalics(pageState.filter.formattedDate)}`;
    },
    paramName: (_pageState) => "date",
    type: "date",
    getValue: (pageState) => pageState.filter.date,
    setValue: async (params, pageState) => {
      const dateStr = params.get("date");
      const date = dateStr ? deserializeDate(dateStr) : undefined;
      if (date) {
        pageState.filter.setDate(date);
      }
    },
    isFilterProp: true,
  },
  {
    formTitle: (pageState) => {
      return `in ${mdItalics(pageState.filter.namedRegion ? prettifyNamedRegion(pageState.filter.namedRegion) : "Unknown")}`;
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
        ["metro", pageState.regionModel.getNamedRegionForMetro],
        ["zoomto", pageState.regionModel.getNamedRegionForName],
      ];
      for (const [key, lookupFn] of zoomParams) {
        const value = params.get(key);
        if (!value) continue;

        const namedRegion = await lookupFn.call(pageState.regionModel, value);
        if (namedRegion) {
          pageState.filter.namedRegion = namedRegion;
          pageState.mapModel.navigateTo(namedRegion, true);
          break;
        } else {
          console.warn(`Could not find region bounds for ${key} = ${value}`);
        }
      }
    },
    isFilterProp: true,
  },
  {
    formTitle: (pageState) => {
      return `from ${pluralize(pageState.filter.selectedEventNames, "event")} ${joinWithAnd(pageState.filter.selectedEventNames.map(mdItalics))}`;
    },
    paramName: (_pageState) => "eventNames",
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
    isFilterProp: true,
  },
  {
    formTitle: (pageState) => {
      return `in precincts with voter lean ${joinWithAnd(pageState.filter.selectedVoterLeans.map(toTitleCase).map(mdItalics))}`;
    },
    paramName: (_pageState) => "voterleans",
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
    isFilterProp: true,
  },
  {
    formTitle: (_pageState) => "Autoplay protests over time",
    paramName: (_pageState) => "autoplay",
    type: "boolean",
    getValue: (pageState) => (pageState.autoplaying ? true : undefined),
    setValue: async (params, pageState) => {
      const autoplay = params.get("autoplay");
      if (autoplay) {
        pageState.autoplaying = autoplay === "1";
      }
    },
    isFilterProp: false,
  },
  {
    formTitle: (pageState) => {
      return `Show ${pageState.filter.markerType}`;
    },
    paramName: (_pageState) => "marker",
    type: "string",
    getValue: (pageState) =>
      pageState.filter.markerType !== "event"
        ? pageState.filter.markerType
        : undefined,
    setValue: async (params, pageState) => {
      const countType = params.get("marker");
      if (countType === "event" || countType === "turnout") {
        pageState.filter.markerType = countType as MarkerType;
      }
    },
    isFilterProp: true,
  },
  {
    formTitle: (pageState) => {
      return `Show ${pageState.filter.turnoutEstimate} turnout numbers`;
    },
    paramName: (_pageState) => "turnout-est",
    type: "string",
    getValue: (pageState) =>
      pageState.filter.turnoutEstimate !== "low"
        ? pageState.filter.turnoutEstimate
        : undefined,
    setValue: async (params, pageState) => {
      const turnoutSource = params.get("turnout-est");
      if (
        turnoutSource === "low" ||
        turnoutSource === "high" ||
        turnoutSource === "average"
      ) {
        pageState.filter.turnoutEstimate = turnoutSource as TurnoutEstimate;
      }
    },
    isFilterProp: true,
  },
  {
    formTitle: (_pageState) => "Debug",
    paramName: (_pageState) => "debug",
    type: "boolean",
    getValue: (pageState) => (pageState.autoplaying ? true : undefined),
    setValue: async (params, pageState) => {
      const debug = params.get("debug");
      if (debug) {
        pageState.debug = debug === "1";
      }
    },
    isFilterProp: false,
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

export function getSearchParamsFromState(
  pageState: PageState,
  specifiedParams?: string[],
  includeAutoplay?: boolean
) {
  const params = new URLSearchParams();
  for (const option of shareOptions) {
    if (
      specifiedParams &&
      !specifiedParams.includes(option.paramName(pageState))
    )
      continue;

    const paramName = resolveWithPageState(option.paramName, pageState);
    const raw = option.getValue(pageState);
    if (raw) {
      const strValue = serializeValue(option.type, raw);
      params.append(paramName, strValue);
    }
  }
  // Total hack - generalize this for options that should be specified independently of current state
  if (includeAutoplay) {
    params.append("autoplay", "1");
  }
  return params;
}

export type PresentableParamOption = {
  title: string;
  paramName: string;
};

export function getFilterParamOptions(
  pageState: PageState
): PresentableParamOption[] {
  const filterOptions = shareOptions
    .filter((option) => option.isFilterProp && option.getValue(pageState))
    .map((option) => ({
      title: option.formTitle(pageState),
      paramName: option.paramName(pageState),
    }));
  return filterOptions;
}
