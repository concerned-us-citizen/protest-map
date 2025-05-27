<script lang="ts">
  import Tour from "./Tour.svelte";
  import CreditsPanel from "./CreditsPanel.svelte";
  import { deviceInfo } from "./store/DeviceInfo.svelte";
  import { titleCase } from "title-case";
  import { markerColor } from "./colors";
  let { onClose, className = '' } = $props();

  let tapping = deviceInfo.tappingOrClicking;
  let tap = deviceInfo.tapOrClick;

</script>

<svelte:head>
  <link rel="preload" as="image" href="timeline.png" />
  <link rel="preload" as="image" href="info-popup.png" />
  <link rel="preload" as="image" href="event-filter.png" />
</svelte:head>

<Tour className={className} steps={[
  {
    title: "US Protests Map",
    description: `
    <p>This map shows recent and planned US protest locations over time, from data collected by <a href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748" target="_blank">We (the People) Dissent</a>. It's synced daily.</p>
    <p>Locations are shown by date, which you can either animate or browse manually.</p>
    `,
  },
  {
    title: "Colored Locations",
    description: `
    <p>Protests are colored <span style='color:${markerColor.red}'>red</span> or <span style='color:${markerColor.blue}'>blue</span> (<span style='color:${markerColor.purple}'>purple</span> when clustered together) to show voter preferences of the surrounding precinct for the 2024 presidential election.</p>
    <p>A precinct's color indicates the margin by which Trump or Harris won the election there, using data compiled by the New York Times.</p>
    <p>Data for some precincts isn't available. Where absent, protests are colored <span style='color:${markerColor.unavailable}'>orange</span>.</p> 
    `,
  },
  {
    title: "The Timeline",
    description: `
    <p>You can step through time by ${tapping} the arrow buttons (or using left/right arrow keys if available).</p>
    <img src="timeline.png" class='tour-image'/>
    <p>You can also select a particular date by ${tapping} within the timeline.</p>
    <p>Or "scrub" through the dates - drag across the timeline to see the map update.</p>
    `,
  },
  {
    title: "Animating Dates",
    description: `
    <p>Or you can press the Play button to watch protests play out over time.</p>
    <p>You can also use the spacebar to toggle animation if it's available.</p>
    `,
  },
  {
    title: "Location Details",
    description: `
    <p>${titleCase(tapping)} a location will present more detail - you can navigate to its Wikipedia entry or the associated event's page (if it has one).</p>
    <img src="info-popup.png" class='tour-image'/>
    `,
  },
  {
    title: "View By Event",
    description: `
    <p>Each protest location is associated with an event (e.g."Hands Off!"). In most cases, there are multiple events on a given day.</p>
    <img src="event-filter.png" class='tour-image' />
    <p>To see specific events' locations, ${tap} on the location count next to the date to see the list of events. Then ${tap} one or more names from that list.</p>
    `,
  },
  {
    title: "Change the Map's View",
    description: `
    <p>You can ${deviceInfo.isTouchDevice ? "use pinch and drag gestures" : "pan and zoom with the mouse"} to see locations more clearly.</p>
    <p>If a keyboard is available, you can also zoom with '+' or 'z', and unzoom with '-' or 'Z'.</p>
    `,
  },
  {
    title: "Credits",
    component: CreditsPanel
  }
]}
on:dismiss={() => {
  onClose();
}}
/>