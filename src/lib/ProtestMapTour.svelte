<script lang="ts">
  import Tour from "./Tour.svelte";
  export let onClose: () => void;
</script>

<Tour
steps={[
  {
    title: "US Protests Map",
    description: `
    <p>This map shows recent and planned US protest locations over time, compiled from data collected by <a href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748" target="_blank">We (the People) Dissent</a>. It is updated hourly.</p>
    <p>It presents locations by date, and you can either play an animation of the compiled dates or select specific days manually.</p>
    `,
  },
  {
    title: "What Do These Signs Mean?",
    description: `
    <p>Protests appear on the map as protest signs, colored in shades of red or blue to give a sense of the broad political affiliation of the surrounding precinct.</p>
    <p>(We use the margin Trump or Harris won by to gauge this.)</p>
    <p>Precinct voting margins across the US are compiled by the New York Times, and data for some precincts isn't available. Where absent, the signs are presented in gray.</p>
    `,
  },
  {
    title: "Animating The Dates",
    description: `
    <p>You can watch the protests play out over time, by toggling the Play/Pause buttons.</p>
    <p>If available, you can also press the spacebar to toggle animation.</p>
    `,
  },
  {
    title: "Using the Timeline",
    description: `
    <p>Instead of animating, you can step through the dates one at a time by clicking the arrow buttons (or the left or right arrow keys if available).</p>
    <img src="timeline.png" class='tour-image' />
    <p>You can also select a particular date by tapping within the timeline.</p>
    <p>Further, you can "scrub" through the dates, by dragging across the timeline to see the map animate as you move.</p>
    `,
  },
  {
    title: "View Location Details",
    description: `
    <p>Tapping a location will show a little more detail about it - you can navigate to a Wikipedia entry on it, or to the associated event's link.</p>
    <img src="info-popup.png" class='tour-image'/>
    `,
  },
  {
    title: "Filter Locations by Events",
    description: `
    <p>The locations available are for multiple events on a given date.</p>
    <p>If you want to see the locations for one or more events, you can filter them with the Events list - simply tap on an event to toggle its visibility.</p>
    `,
  },
  {
    title: "The Map Is Interactive",
    description: `
    <p>You can zoom and pan (pinch and drag on mobile devices) around the map to see more locations or detail.</p>
    <p>Our apologies to those with events not initially visible in the initial continental US viewport - your protests are here too!</p>
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