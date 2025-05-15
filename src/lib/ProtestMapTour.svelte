<script lang="ts">
  import Tour from "./Tour.svelte";
  export let onClose: () => void;
</script>

<Tour
steps={[
  {
    title: "US Protests Map",
    description: `
    <p>This map shows recent and planned US protest locations over time, compiled from data collected by <a href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748" target="_blank">We (the People) Dissent</a>. It is updated hourly from that list.</p>
    <p>Locations are presented by date, and you can either play an animation of the compiled dates or select specific days manually.</p>
    `,
  },
  {
    title: "Colored Locations",
    description: `
    <p>Protests appear on the map as protest signs, colored in shades of red or blue to reflect the 2024 voting results of the surrounding precinct.</p>
    <p>This is presented using the margin by which Trump or Harris won the election in that precinct, from data compiled by the New York Times.</p>
    <p>Data for some precincts isn't available; where absent, signs are presented in gray.</p>
    `,
  },
  {
    title: "Animating The Dates",
    description: `
    <p>You can watch the protests play out over time, by toggling the Play/Pause buttons.</p>
    <p>You can also press the spacebar to toggle animation if it's available.</p>
    `,
  },
  {
    title: "Using the Timeline",
    description: `
    <p>Instead of animating, you can step through the dates by clicking the arrow buttons (or the left or right arrow keys if available).</p>
    <img src="timeline.png" class='tour-image' />
    <p>You can select a particular date by tapping within the timeline.</p>
    <p>You can also "scrub" through the dates, by dragging across the timeline to see the map animate as you move.</p>
    `,
  },
  {
    title: "View Location Details",
    description: `
    <p>Tapping a location will present more detail about it - you can navigate to a Wikipedia entry on it, or to the associated event's link.</p>
    <img src="info-popup.png" class='tour-image'/>
    `,
  },
  {
    title: "View By Event",
    description: `
    <p>Each protest location is associated with an event (e.g."Hands Off!"). In many cases, there are multiple events on a given day.</p>
    <img src="event-filter.png" class='tour-image' />
    <p>To see specific events' locations, tap the filter tool button to see the list of events. Then tap one or more names from that list.</p>
    `,
  },
  {
    title: "Change the Map's View",
    description: `
    <p>You can zoom and pan (pinch and drag on mobile devices) around the map to reveal more locations or see areas in more detail.</p>
    <p>The map initially shows only the continental US, but there are more protests (e.g. Alaska and Hawaii).</p>
    `,
  },
  {
    title: "Thanks For Watching",
    description: `
    <p>Tap Dismiss to explore the map.</p>
    `,
  },
]}
on:dismiss={() => {
  onClose();
}}
/>