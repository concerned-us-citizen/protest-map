import { Coordinates, Nullable } from "../../src/lib/types";
import { load } from "cheerio";
import { fetchHtml } from "../../src/lib/util/html";
import vm from "vm";

export interface EventLinkLocation {
  coordinates: Nullable<Coordinates>;
  name: Nullable<string>;
  address: Nullable<string>;
  city: Nullable<string>;
  state: Nullable<string>;
}

export async function fetchEventLinkLocationInfo(
  url: string
): Promise<Nullable<EventLinkLocation>> {
  if (!url) {
    return null;
  }

  let hostname = "";
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname;
  } catch {
    return null; // Invalid URL
  }

  switch (hostname) {
    case "mobilize.us":
      return await fetchMobilizeEventLinkLocationInfo(url);
    default:
      return null;
  }
}

async function fetchMobilizeEventLinkLocationInfo(
  url: string
): Promise<Nullable<EventLinkLocation>> {
  const html = await fetchHtml(url);
  const $ = load(html);

  const dataProp = "__MLZ_CLIENT_VARS__";
  const dataScript = $("script")
    .filter((_, el) => !!$(el).html()?.includes(`window.${dataProp}`))
    .first()
    .html();

  if (!dataScript) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventInfo: any;
  try {
    vm.runInNewContext(dataScript, context);
    eventInfo = context.window[dataProp].event;
  } catch (e) {
    console.error("Failed to evaluate JS", e);
  }

  return {
    name: eventInfo.location_name,
    address: eventInfo.address_line1,
    city: eventInfo.city,
    state: eventInfo.state,
    coordinates: {
      lat: eventInfo.lat,
      lon: eventInfo.lon,
    },
  };
}
