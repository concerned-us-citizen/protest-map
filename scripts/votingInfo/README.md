# Precinct Data Spatial Index Generation

This directory contains the scripts involved in generating and querying a spatial index generated from detailed precinct-level election data from the NY Times. It consists of two scripts:
- `build-spatial-index.js` - part of the pipeline involved in creating an efficient spatial index (`prebuilt_data/precincts-with-results-spatial-index.json`)from the source NY Times .topojson file. It is only needed if the NY Times data is ever updated (highly unlikely), mostly here to document its origin.

- `votingInfo.mjs` - provides functions for loading the spatial index and querying it. This is used by the parent `scrapeAllTabs.js` script to load and query the spatial index file while mapping geocoordinates to precinct voting margins.

## Background

The original NY Times precinct-level election data is provided as a large TopoJSON file (approximately 0.5 GB). Querying this file directly to find voting results for specific geographic coordinates (latitude/longitude) would be inefficient and slow, especially for a web application or a script that needs to perform many such lookups (like the main `scrapeAllTabs.js` script in this project).

To optimize this lookup process, a spatial index is pre-built. This index allows for much faster querying of voting results based on geographic points.

## Spatial Index Creation Process

1.  **Source Data:**
    *   The primary source is the `precincts-with-results.topojson` file from The New York Times' "Presidential Precinct Map 2024" project.
    *   This data can be found at: [https://github.com/nytimes/presidential-precinct-map-2024](https://github.com/nytimes/presidential-precinct-map-2024)
    *   Due to its size, this source TopoJSON file is **not** committed to this repository. It must be downloaded manually.
    *   The `build-spatial-index.js` script consumes an intermediate `precincts-with-results.geojson` file.

2.  **Conversion from TopoJSON to GeoJSON:**
    *   The original `precincts-with-results.topojson` must first be converted to `precincts-with-results.geojson`. This step is not automated by the current scripts but can be performed using the `ogr2ogr` command-line utility (part of the GDAL library).
    *   **Prerequisite:** Install GDAL. On macOS, this can often be done with Homebrew: `brew install gdal`.
    *   **Conversion Commands** (assuming `precincts-with-results.topojson` is in a local `cache` or temporary directory):
        ```bash
        # Step 1: Convert TopoJSON to an intermediate GeoJSON in Mercator projection
        ogr2ogr -f GeoJSON ./cache/temp-mercator.geojson ./cache/precincts-with-results.topojson -s_srs EPSG:4326 -t_srs EPSG:3857
        
        # Step 2: Convert Mercator GeoJSON back to WGS84 (EPSG:4326), simplify, and set coordinate precision
        ogr2ogr -f GeoJSON ./cache/precincts-with-results.geojson ./cache/temp-mercator.geojson -s_srs EPSG:3857 -t_srs EPSG:4326 -simplify 100 -lco COORDINATE_PRECISION=5
        ```
    *   The resulting `./cache/precincts-with-results.geojson` is then used by the `build-spatial-index.js` script. This GeoJSON file is also not committed to the repository.

3.  **Index Generation (`build-spatial-index.js`):**
    *   The `build-spatial-index.js` script processes the `precincts-with-results.geojson` file (generated in the previous step).
    *   It uses a spatial indexing library (e.g., `rbush` or similar, as seen in `topojson-query.js`) to create an efficient R-tree data structure for point-in-polygon lookups.
    *   The script extracts the relevant voting margin data (e.g., `pct_dem_lead`) for each precinct and associates it with the spatial index.
    *   The output is a JSON file (`prebuilt_data/precincts-with-results-spatial-index.json`) containing the spatial index and the associated voting data, optimized for quick lookups.

4.  **Usage (`votingInfo.mjs`):**
    *   The `votingInfo.mjs` script provides functions to load and query this pre-built spatial index (`prebuilt_data/precincts-with-results-spatial-index.json`).
    *   Its `fetchVotingInfo(geo)` function takes geographic coordinates and uses the spatial index to quickly find the corresponding precinct's voting margin.

## Output File

*   **`prebuilt_data/precincts-with-results-spatial-index.json`**: This is the generated spatial index file. It is committed to the repository as it's a necessary pre-built artifact for the main data scraping process.

## Running the Index Generation

To regenerate the `prebuilt_data/precincts-with-results-spatial-index.json` file:

1.  **Download Source Data:** Obtain the latest `precincts-with-results.topojson` file from the NYT GitHub repository and place it in a temporary location (e.g., `./cache/`).
2.  **Convert to GeoJSON:** Use `ogr2ogr` as described in "Process Step 2" to convert the TopoJSON file to `precincts-with-results.geojson` (e.g., in `./cache/`).
3.  **Run Build Script:** Navigate to the `scripts/precinct-data-spatial-index/` directory and run:
    ```bash
    node build-spatial-index.js
    ```
    (Ensure the script is configured to read the GeoJSON from the correct location, e.g., `../../cache/precincts-with-results.geojson`).

This will update the `prebuilt_data/precincts-with-results-spatial-index.json` file. Remember to commit this updated file to the repository if it has changed.