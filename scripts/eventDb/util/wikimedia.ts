import crypto from "crypto";

const BASE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb";

export function urlForWikiThumbnailUrl(url: string, width: number = 320) {
  if (url) {
    const filename = decodeURIComponent(url)
      .split("Special:FilePath/")[1]
      .replace(/ /g, "_");

    const hash = crypto.createHash("md5").update(filename).digest("hex");
    const encodedFileName = encodeURIComponent(filename);
    return `${BASE_URL}/${hash[0]}/${hash.substring(0, 2)}/${encodedFileName}/${width}px-${encodedFileName}`;
  } else {
    return "";
  }
}
