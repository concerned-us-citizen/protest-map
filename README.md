# US Protest Event Map

This project displays recent and planned US protest locations over time on an interactive map, using data provided by We (the People) Dissent. Locations are colored to indicate the 2024 Trump or Harris voting margin for their surrounding precinct.

<img src="static/desktop-screenshot.png" width="500">

## Project Overview

The project creates and deploys a static web site to GitHub Pages. It has two main components:

1.  **Data Scraper (`scripts/scrapeAllTabs.js`):**
    *   This Node.js script fetches event data from a Google Sheet maintained by the volunteer organization [We (the People) Dissent](https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748).
    *   It augments this event data with:
        *   Geocoding information from [Nominatim](https://nominatim.openstreetmap.org) for event locations.
        *   Location image and title information from [Wikipedia](https://wikipedia.org).
        *   Voting precinct margin data from a dataset published by [The New York Times (GitHub)](https://github.com/nytimes/presidential-precinct-map-2024).
    *   The script outputs a consolidated `static/data/data.json` file (with an `updatedAt` timestamp), ensuring dates for events are normalized to `YYYY-MM-DD` format.

2.  **SvelteKit Application (Static Site):**
    *   A static SvelteKit application located in the `src` directory consumes the `static/data/data.json` file.
    *   It provides an interactive map interface where users can:
        *   View protest events over a timeline.
        *   Play an animation of events occurring day by day.
        *   Manually select dates using a histogram slider or arrow keys.
        *   Filter locations by event.
        *   View details about event locations and their political leaning based on 2024 voting margins.


## Development

1.  **Install Dependencies:**
    ```bash
    npm run setup # Downloads prebuilt files
    npm install
    ```

2.  **Generate Data:**
    *   Perform a live scrape and generate `static/data/data.json`:
        ```bash
        node scripts/scrapeAllTabs.js
        ```
    
    *   Once the first scrape has been performed, if you don't care about the latest event locations, you can suppress fetches using cached values instead, by adding --use-cache to scrapeAllTabs.js:
        ```bash
        node scripts/scrapeAllTabs.js --use-cache
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

1.  **Ensure Data is Up-to-Date:** Run the scraper script (step 2 in Development) to generate the latest `static/data/data.json`.
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

It is also run daily using a cron trigger, and may be manually triggered as well.

## Updating Cached Data

Scrapes make use of prebuilt cache files to improve fetching/processing time of geocoding and wiki info. The initial versions of these files are included in the repo to minimize cold start time. In GitHub actions, as scrapes occur, new versions of these are accumulated in a github cache, that now have newer data than the rep files. 

To update the repo versions, run the following:

    ```bash
    node scripts/scrapeAllTabs.js --updatePrebuiltData
    ```
Then commit changes and push to the repo.
