<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { EventData } from '$lib/types.ts';
  import CreditsPanel from '$lib/CreditsPanel.svelte';
  import MapDisplay from '$lib/MapDisplay.svelte';
  import DateHistogramSlider from '$lib/DateHistogramSlider.svelte';
  import ProtestMapTour from '$lib/ProtestMapTour.svelte';
  import EventInfo from '$lib/EventInfo.svelte';
  import EventsFilter from '$lib/EventsFilter.svelte';
  import { playIconSvg, pauseIconSvg, filterIconSvg, infoIconSvg } from '$lib/icons';
  import { parseDateString, formatShortDate, formatDateTimeReadable } from '$lib/dateUtils.js';

export let data: EventData;

  let currentDateString: string = '';
  let allDates: string[] = [];
  let index: number = 0;
  let playing = false;
  let timer: ReturnType<typeof setTimeout>;
  let distinctLocationCount: number = 0;
  let uniqueEvents: { name: string, count: number }[] = [];
  let histogramData: { date: string, locationCount: number }[] = [];
  let systemTodayDate: string = '';
  let showTour = false;

  let selectedEventNames: Set<string> = new Set();
  let creditsPanelVisible = false;
  let eventsFilterVisible = false;
  let isDragging = false; // Add back isDragging state

  // State for controlling EventInfo visibility on mobile
  let isMobile = false;
  let showEventInfoMobile = false;
  let eventInfoMobileTimeout: ReturnType<typeof setTimeout> | null = null;
  const MOBILE_INFO_VISIBILITY_DURATION = 1000; // 1 second

  // State for repeating actions
  let repeatTimer: ReturnType<typeof setTimeout> | null = null;
  let isRepeatingAction: boolean = false;
  let currentRepeatDirection: 'next' | 'prev' | null = null;
  const INITIAL_REPEAT_DELAY = 400; // ms
  const REPEAT_INTERVAL = 80;    // ms

  function toggleEventsFilterVisibility() {
    eventsFilterVisible = !eventsFilterVisible;
    if (eventsFilterVisible && creditsPanelVisible) {
      creditsPanelVisible = false;
    }
  }

  function handleDateSelectFromSlider(selectedDate: string) {
    const newIndex = allDates.indexOf(selectedDate);
    if (newIndex !== -1) {
      index = newIndex;
    }
    // On mobile, show info panel when date is selected via slider drag
    if (isMobile) {
      showEventInfoMobile = true;
      resetEventInfoMobileTimeout();
    }
  }

  function togglecreditsPanelVisibility() {
    creditsPanelVisible = !creditsPanelVisible;
    if (creditsPanelVisible && eventsFilterVisible) {
      eventsFilterVisible = false;
    }
  }

  function selectEventFilter(eventName: string) {
    const newSelectedEventNames = new Set(selectedEventNames);
    if (newSelectedEventNames.has(eventName)) {
      newSelectedEventNames.delete(eventName);
    } else {
      newSelectedEventNames.add(eventName);
    }
    selectedEventNames = newSelectedEventNames;
  }

  const QUICK_NAV_TIME = 500; // ms, for < 20 events
  const STANDARD_NAV_TIME = 1000; // ms, for >= 20 events
  const ZERO_EVENT_NAV_TIME = 50; // ms, for dates with no events

  function scheduleNextDateAdvance() {
    clearTimeout(timer);
    if (!playing || !allDates.length || !data?.events) return;

    const numEvents = (data.events[currentDateString] || []).length;
    let lingerTime;

    if (numEvents === 0 && allDates.length > 1) {
      lingerTime = ZERO_EVENT_NAV_TIME;
    } else if (numEvents < 20) {
      lingerTime = QUICK_NAV_TIME;
    } else {
      lingerTime = STANDARD_NAV_TIME;
    }

    timer = setTimeout(() => {
      if (playing) {
        index = (index + 1) % allDates.length;
      }
    }, lingerTime);
  }

  function togglePlayback() { // Add back togglePlayback function
    playing = !playing;
    if (playing) {
      scheduleNextDateAdvance();
    } else {
      clearTimeout(timer);
    }
  }

  function nextDate() {
    if (allDates.length > 0) {
      index = (index + 1) % allDates.length;
      // On mobile, show info panel on next/prev click
      if (isMobile) {
        showEventInfoMobile = true;
        resetEventInfoMobileTimeout();
      }
    }
  }

  function prevDate() {
    if (allDates.length > 0) {
      index = (index - 1 + allDates.length) % allDates.length;
      // On mobile, show info panel on next/prev click
      if (isMobile) {
        showEventInfoMobile = true;
        resetEventInfoMobileTimeout();
      }
    }
  }

  function stopDateRepeat() {
    if (repeatTimer) {
      clearTimeout(repeatTimer);
      repeatTimer = null;
    }
    isRepeatingAction = false;
    currentRepeatDirection = null;
    // On mobile, hide info panel after repeat stops, unless a click just happened
    if (isMobile && !isDragging) { // Only hide if not currently dragging the slider
       // The timeout handles hiding after a short delay
    }
  }

  function continuousDateChange() {
    if (!isRepeatingAction || !currentRepeatDirection) {
      stopDateRepeat();
      return;
    }
    if (currentRepeatDirection === 'next') {
      nextDate();
    } else if (currentRepeatDirection === 'prev') {
      prevDate();
    }
    repeatTimer = setTimeout(continuousDateChange, REPEAT_INTERVAL);
  }

  function startDateRepeat(direction: 'next' | 'prev') {
    // If already repeating in the same direction, do nothing.
    if (isRepeatingAction && currentRepeatDirection === direction) return;

    // Stop any existing repeat action.
    stopDateRepeat();

    isRepeatingAction = true;
    currentRepeatDirection = direction;

    // On mobile, show info panel when repeat starts
    if (isMobile) {
      showEventInfoMobile = true;
      resetEventInfoMobileTimeout();
    }

    // Schedule the first continuous change after INITIAL_REPEAT_DELAY.
    // The immediate first change will be handled by the on:click event.
    repeatTimer = setTimeout(() => {
      // Ensure we are still supposed to be repeating before the first programmatic change
      if (isRepeatingAction && currentRepeatDirection === direction) {
        continuousDateChange();
      }
    }, INITIAL_REPEAT_DELAY);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      toggleEventsFilterVisibility();
    } else if (event.key === 'i' || event.key === 'I') {
      event.preventDefault();
      togglecreditsPanelVisibility();
    } else if (event.key === 'Escape' || event.code === 'Escape') {
      event.preventDefault();
      creditsPanelVisible = false;
      eventsFilterVisible = false;
    } else if (!playing) {
      if (event.key === 'ArrowLeft' || event.code === 'ArrowLeft') {
        if (!event.repeat) {
          prevDate(); // Immediate action for keydown
          startDateRepeat('prev'); // Setup repeat
        }
        event.preventDefault();
      } else if (event.key === 'ArrowRight' || event.code === 'ArrowRight') {
        if (!event.repeat) {
          nextDate(); // Immediate action for keydown
          startDateRepeat('next'); // Setup repeat
        }
        event.preventDefault();
      }
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (!playing) {
      if ((event.key === 'ArrowLeft' || event.code === 'ArrowLeft') && currentRepeatDirection === 'prev') {
        stopDateRepeat();
      } else if ((event.key === 'ArrowRight' || event.code === 'ArrowRight') && currentRepeatDirection === 'next') {
        stopDateRepeat();
      }
    }
  }

  function resetEventInfoMobileTimeout() {
    if (eventInfoMobileTimeout) {
      clearTimeout(eventInfoMobileTimeout);
    }
    eventInfoMobileTimeout = setTimeout(() => {
      showEventInfoMobile = false;
    }, MOBILE_INFO_VISIBILITY_DURATION);
  }

  function restartTour() {
    showTour = true;
    creditsPanelVisible = false;
  }

  function saveShownTourToCookie() {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `hasShownTour=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }

  function hasShownTourCookieExists() {
    return !(document.cookie.split('; ').find(row => row.startsWith('hasShownTour=')) ?? false);
  }

  onMount(async () => {
    if (browser) {
      // Check for mobile device
      isMobile = window.matchMedia('(max-width: 768px)').matches;

      showTour = !hasShownTourCookieExists();
      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('keyup', handleKeyup);
      document.addEventListener('click', handleDocumentClick, true);

      const today = new Date();
      systemTodayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    if (data && data.events) {
        allDates = Object.keys(data.events)
          // Ensure keys are valid dates that can be parsed by our utility before sorting
          .filter(dateStr => dateStr && dateStr.trim() !== '' && parseDateString(dateStr) !== null)
          .sort((a, b) => {
            const dateA = parseDateString(a);
            const dateB = parseDateString(b);
            // This should ideally not happen if filter works and dates are YYYY-MM-DD
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
          });
    }

    if (playing) {
      scheduleNextDateAdvance();
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      document.removeEventListener('click', handleDocumentClick, true);
    }
    clearTimeout(timer);
    if (eventInfoMobileTimeout) {
      clearTimeout(eventInfoMobileTimeout);
    }
  });

  function handleDocumentClick(event: MouseEvent) {
    if (!browser) return;

    const target = event.target as HTMLElement;

    const isClickInsideToolbar = target.closest('.toolbar');
    const isClickInsidecreditsPanel = target.closest('.credits-panel'); // Renamed class
    const isClickInsideEventsFilter = target.closest('.events-filter-wrapper');
    const isClickInsideSlider = target.closest('.bottom-panel-container'); // Use the container class

    // On mobile, if clicking outside the main panels, hide the info panel
    if (isMobile && !isClickInsideToolbar && !isClickInsidecreditsPanel && !isClickInsideEventsFilter && !isClickInsideSlider) {
       showEventInfoMobile = false;
       if (eventInfoMobileTimeout) {
         clearTimeout(eventInfoMobileTimeout);
       }
    }

    // Always hide help/filter panels if clicking outside them
    if (!isClickInsideToolbar && !isClickInsidecreditsPanel && !isClickInsideEventsFilter) {
      if (creditsPanelVisible) {
        creditsPanelVisible = false;
      }
      if (eventsFilterVisible) {
        eventsFilterVisible = false;
      }
    }
  }

  // Handle click on the bottom controls wrapper itself to show info on mobile
  function handleBottomControlsClick(event: MouseEvent) {
    // Check if the click originated from a navigation button
    const target = event.target as HTMLElement;
    if (target.closest('.nav-button')) {
      return; // Do nothing if a nav button was clicked
    }

    if (isMobile) {
      showEventInfoMobile = true;
      resetEventInfoMobileTimeout();
    }
  }

  $: if (allDates.length > 0 && data && data.events) {
    currentDateString = allDates[index];
    selectedEventNames = new Set();
    const currentDayEvents = data?.events?.[currentDateString] || [];

    const locationsForDay = new Set(currentDayEvents.map(event => event.location));
    distinctLocationCount = locationsForDay.size;

    const eventCountsByName = currentDayEvents.reduce((acc, event) => {
      acc[event.name] = (acc[event.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    uniqueEvents = Object.entries(eventCountsByName)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (data && data.events) {
        histogramData = allDates.map(dateStr => {
            const eventsOnDate = data.events[dateStr] || [];
            const distinctLocations = new Set(eventsOnDate.map(event => event.location));
            return { date: dateStr, locationCount: distinctLocations.size };
        });
    }

    if (playing) {
      scheduleNextDateAdvance();
    }
  }

  // Reactive statement to control isScrubbingDate based on mobile state and showEventInfoMobile
  $: isScrubbingDate = isMobile ? showEventInfoMobile : true; // Always true on desktop
</script>

<style>
  @import "./page-styles.css";
</style>

<svelte:head>
  <title>US Protests Map</title>
</svelte:head>

{#if data && data.events && data.locations}
  <MapDisplay eventData={data} {currentDateString} {selectedEventNames} />

  <div class="top-center-container">
    <div class="top-center-main-panel">
      <h3 class="main-title">
        Protests on {formatShortDate(currentDateString)}
      </h3>
      <div class="attribution-link">
        <i>Provided by <a
          href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
          target="_blank"
          title={data?.updatedAt ? `Last updated: ${formatDateTimeReadable(String(data.updatedAt))}` : 'Source data'}
        >We (the People) Dissent</a></i>
      </div>
    </div>
    {#if eventsFilterVisible && uniqueEvents.length > 0 }
      <div class="events-filter-wrapper">
        <EventsFilter {uniqueEvents} {selectedEventNames} onSelectEventFilter={selectEventFilter} onClose={() => eventsFilterVisible = false} />
      </div>
    {/if}
  </div>

  <div class="toolbar">
    <button class="icon-button main-play-pause-button" on:click={togglePlayback} title={playing ? 'Pause Animation (Space)' : 'Play Animation (Space)'} aria-label={playing ? 'Pause Animation (Space)' : 'Play Animation (Space)'}>
      {@html playing ? pauseIconSvg : playIconSvg}
    </button>
    <button
      class="icon-button filter-toggle-button"
      class:dimmed={uniqueEvents.length <= 1}
      on:click={() => {
        if (uniqueEvents.length > 1) {
          toggleEventsFilterVisibility();
        }
      }}
      title={uniqueEvents.length <= 1 ? "No events to filter" : "Toggle Event Filter (F)"}
      aria-label={uniqueEvents.length <= 1 ? "No events to filter" : "Toggle Event Filter"}
      disabled={uniqueEvents.length <= 1}
    >
      {@html filterIconSvg}
    </button>
    <button class="icon-button info-toggle-button" on:click={togglecreditsPanelVisibility} title="Show Information Panel (I)" aria-label="Show Information Panel (I)">
      {@html infoIconSvg}
    </button>
  </div>

  {#if histogramData.length > 0 && currentDateString}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bottom-controls-wrapper" class:is-scrubbing={isScrubbingDate} on:click={handleBottomControlsClick}>
      <EventInfo 
        visible={isScrubbingDate}
        currentDateString={currentDateString}
        displayedEventNameCount={uniqueEvents.filter(e => e.name && e.name.trim() !== '').length}
        {distinctLocationCount}
        allEventNames={uniqueEvents.map(e => e.name).filter(name => name && name.trim() !== '').join(', ')}
      />
      <div class="slider-container">
        <DateHistogramSlider
          {histogramData}
          {currentDateString}
          {systemTodayDate}
          onDateSelect={handleDateSelectFromSlider}
          onPrev={prevDate}
          onNext={nextDate}
          onStartRepeatPrev={() => startDateRepeat('prev')}
          onStartRepeatNext={() => startDateRepeat('next')}
          onStopRepeat={stopDateRepeat}
          on:dragstart={() => { if(isMobile) showEventInfoMobile = true; }}
          on:dragend={() => { if(isMobile) resetEventInfoMobileTimeout(); }}
        />
      </div>
    </div>
  {/if}

  <CreditsPanel visible={creditsPanelVisible} onClose={togglecreditsPanelVisibility} onRestartTour={restartTour} />

  {#if showTour}
    <ProtestMapTour onClose={() => {
      showTour = false;
      saveShownTourToCookie();
    }} />
  {/if}
{/if}
