# US Protest Event Map

This project displays recent and planned US protest locations over time on an interactive map, using data provided by We (the People) Dissent. Locations are colored to indicate the 2024 Trump or Harris voting margin for their surrounding precinct.

<img src="static/desktop-screenshot.png" width="500">

## Project Overview

The project creates and deploys a static web site to GitHub Pages. It has two main components:

1.  **Data Scraper (`scripts/eventDb/buildEventsDb.ts`):**
    *   This node script fetches event data from a Google Sheet maintained by the volunteer organization [We (the People) Dissent](https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748).
    *   It augments this event data with:
        *   Geocoding information from [Nominatim](https://nominatim.openstreetmap.org) for event locations.
        *   Location image and title information from [Wikipedia](https://wikipedia.org).
        *   Voting precinct margin data from a dataset published by [The New York Times (GitHub)](https://github.com/nytimes/presidential-precinct-map-2024).
    *   From this it generates a static sqlite database that is   downloaded and consumed by the app at runtime.

2.  **SvelteKit Application (Static Site):**
    *   A static SvelteKit application located in the `src` directory consumes the .sqlite database.
    *   It provides an interactive map interface where users can:
        *   View protest events over a timeline.
        *   Play an animation of events occurring day by day.
        *   Manually select dates using a histogram slider or arrow keys.
        *   Filter locations by event.
        *   View details about event locations and their political leaning based on 2024 voting margins.


## Development

1.  **Install Dependencies:**
    ```bash
    # npm libraries
    npm install

    # Fetch preprocessed NY Times precinct database
    npm run download-precincts-spatial-index

    # Fetch preprocessed region (zip/city/state) data
    npx tsx scripts/downloadRegionData.ts

    # Fetch cache of Nominatim and Wikidata data
    npx tsx scripts/eventDb/releaseManager.ts download-cache
    ```

2.  **Generate Data:**
    *   Perform a live scrape and generate `build_db/events.sqlite`:
        ```bash
        npm run build-events-db
        ```
    
        Running this generates multiple artifacts in the build_db directory:
        * *events.sqlite* - the database used by the app
        * *cached-location-data.sqlite* - an accumulating cache of data retrieved from Nominatim and Wikidata used during the build process. See **Managing Cached Lookup Data** below for details on how to manage this.
        * *issues.log* - a log of errors and stats from the run.
    
    * Install `events.sqlite` to the static directory
        ```bash
        npx tsx scripts/eventDb/versionAndCopyDb.ts
        ``` 

3.  **Run SvelteKit Dev Server:**
    ```bash
    npm run dev
    ```
    Or to open in a browser automatically:
    ```bash
    npm run dev -- --open
    ```

## Building for Production

1.  **Ensure Data is Up-to-Date:** Run the scraper script (step 2 in Development) to generate the latest `static/data/events.sqlite`.
2.  **Build the SvelteKit App:**
    ```bash
    npm run build
    ```
    This will create a production version of your app in the `build` directory (or as configured by your SvelteKit adapter).

3.  **Preview the Production Build:**
    ```bash
    npm run preview
    ```

## Deployment

This project uses a GitHub Action to scrape the latest data, then build the site from it. 

The action is triggered by repo pushes, so simply pushing changes to GitHub will update the page.

It is runs nightly using a cron trigger, and may be manually triggered as well.

## Managing Cached Lookup Data
 Lookups for external services like Nominatim and Wikidata is slow - we intentionally throttle requests to 1 per second or longer, and events often take several requests to complete. It's also good form not to repeat requests where possible, so we maintain a cache of results.

For best results, this should be kept as current as possible. To facilitate this, we maintain a source of truth in a Releases build artifact in the project - it can be uploaded/downloaded using `releaseManager.ts` For example, use 
```
npx tsx scripts/eventDb/releaseManager.ts upload-cache
```
after doing scrapes to update it, and begin your session before doing scrapes with:        
```
npx tsx scripts/eventDb/releaseManager.ts download-cache
```
to get the latest from the previous night's build on Github.

This way, whoever's doing a scrape (dev or the github action) benefits from work previously done.
