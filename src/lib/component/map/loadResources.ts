import maplibregl from "maplibre-gl";

const spriteIcons = [
  ["event-marker-red", "/sprites/event-marker-red.png"],
  ["event-marker-blue", "/sprites/event-marker-blue.png"],
  ["event-marker-purple", "/sprites/event-marker-purple.png"],
  ["event-marker-unavailable", "/sprites/event-marker-unavailable.png"],
  ["turnout-marker-red", "/sprites/turnout-marker-red.png"],
  ["turnout-marker-blue", "/sprites/turnout-marker-blue.png"],
  ["turnout-marker-purple", "/sprites/turnout-marker-purple.png"],
  ["turnout-marker-unavailable", "/sprites/turnout-marker-unavailable.png"],
];

// Helper function to load an individual image and add it to the map
async function loadImageToMap(
  mapInstance: maplibregl.Map,
  name: string,
  url: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      if (!mapInstance.hasImage(name)) {
        mapInstance.addImage(name, img);
      }
      resolve();
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${url}`);
      reject(`Failed to load image: ${url}`);
    };
  });
}

export async function loadResources(map: maplibregl.Map) {
  // Await all image loading promises concurrently
  const imageLoadPromises = spriteIcons.map(([name, url]) =>
    loadImageToMap(map, name, url)
  );
  await Promise.all(imageLoadPromises);

  // Await for the map to fully load its style and resources
  await new Promise<void>((resolve) => {
    if (map.isStyleLoaded()) {
      // Check if style is already loaded
      resolve();
    } else {
      map.on("load", () => {
        resolve();
      });
    }
  });
}
