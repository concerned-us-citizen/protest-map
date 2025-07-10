<script module lang="ts">
  export const protestMapTourId = "protest-map-tour-id";
</script>

<script lang="ts">
  import Tour from "$lib/component/dialog/Tour.svelte";
  import CreditsPanel from "../CreditsPanel.svelte";
  import { deviceInfo } from "../../model/DeviceInfo.svelte";
  import { titleCase } from "title-case";
  import { markerColor } from "../../colors";
  import type { ClassValue } from "svelte/elements";
  import { getShortcutPrefix } from "$lib/util/os";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  let tapping = deviceInfo.tappingOrClicking;
  let tap = deviceInfo.tapOrClick;

  function saveShownTourToCookie() {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `hasShownTour=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }
</script>

<svelte:head>
  <link rel="preload" as="image" href="tour-images/timeline.png" />
  <link rel="preload" as="image" href="tour-images/date-picker.png" />
  <link rel="preload" as="image" href="tour-images/info-popup.png" />
  <link rel="preload" as="image" href="tour-images/popup-turnout.png" />
  <link rel="preload" as="image" href="tour-images/event-filter.png" />
  <link rel="preload" as="image" href="tour-images/back-button.png" />
</svelte:head>

<Tour
  id={protestMapTourId}
  onDismiss={() => saveShownTourToCookie()}
  class={className}
  steps={[
    {
      title: "US Protests Map",
      description: `
    <p>This map shows recent and planned US protest locations and turnout over time, from data collected by <a href="https://thepeopledissent.substack.com" target="_blank">We (the People) Dissent</a>. It's synced daily.</p>
    <p>Locations are shown by date, which you can either browse or run as an animation.</p>
    <p>For larger event days, estimated protester turnouts may also be presented.
    <p><i>Important: locations are approximate. For addresses, follow the event name link that appears when clicking on a marker.</i></p>
    `,
    },
    {
      title: "Colored Voter Lean",
      description: `
    <p>Protests are colored <span style='color:${markerColor.red}'>red</span> or <span style='color:${markerColor.blue}'>blue</span> (<span style='color:${markerColor.purple}'>purple</span> when clustered together) to show voter preferences of the surrounding precinct for the 2024 presidential election.</p>
    <p>A precinct's color indicates whether Trump or Harris won the election there, using data compiled by the New York Times.</p>
    <p>Data for some precincts isn't available. Where absent, protests are colored <span style='color:${markerColor.unavailable}'>orange</span>.</p> 
    `,
    },
    {
      title: "Selecting Dates",
      description: `
    <p>You can ${tap} the current date to reveal a date picker:</p>
    <img src="tour-images/date-picker.png" class='tour-image'/>
    <p>You can also ${tap} within the timeline to select a date, drag across it to see the map update live, or press Play to watch it animate.</p>
    <img src="tour-images/timeline.png" class='tour-image'/>
    <p>Arrow buttons and the keyboard shortcuts ${getShortcutPrefix()}-Left and ${getShortcutPrefix()}-Right work as well.</p>
    <p></p>

    `,
    },
    {
      title: "Location Details",
      description: `
    <p>${titleCase(tapping)} on a location marker presents more detail - you can navigate to its Wikipedia entry or the associated event's page (if it has one).</p>
    <img src="tour-images/info-popup.png" class='tour-image'/>
    <p>When looking at dates with turnout data, you'll also see count information and sources.</p>
        <img src="tour-images/popup-turnout.png" class='tour-image'/>
    `,
    },
    {
      title: "View By Event",
      description: `
    <p>Each protest location is associated with an event (e.g."Hands Off!"). In most cases, there are multiple events on a given day.</p>
    <img src="tour-images/event-filter.png" class='tour-image' />
    <p>To see specific events' locations, ${tap} on the location count next to the date to see the list of events. Then ${tap} one or more names from that list.</p>
    `,
    },
    {
      title: "Change the Map's View",
      description: `
    <p>You can ${deviceInfo.isTouchDevice ? "use pinch and drag gestures" : "pan and zoom with the mouse"} to see locations more clearly.</p>
    <p>With a keyboard, you can zoom with '+' or ${getShortcutPrefix()}-z, and unzoom with '-' ${getShortcutPrefix()}-Z.</p>
    <p>When you navigate the map by expanding a marker group or zooming to a region, you can get back to your last view by clicking on the back arrow, or pressing ${getShortcutPrefix()}-B.</p>
        <img src="tour-images/back-button.png" class='tour-image' />
    `,
    },
    {
      title: "Feedback and Credits",
      component: CreditsPanel,
    },
  ]}
/>
