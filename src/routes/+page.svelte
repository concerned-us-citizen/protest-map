<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { EventData } from '$lib/types.ts';
  import HelpPanel from '$lib/HelpPanel.svelte';
  import MapDisplay from '$lib/MapDisplay.svelte';
  import DateHistogramSlider from '$lib/DateHistogramSlider.svelte';
  import EventInfo from '$lib/EventInfo.svelte';
  import EventsFilter from '$lib/EventsFilter.svelte';
  import { playIconSvg, pauseIconSvg, filterIconSvg } from '$lib/icons';
  import { parseDateString, formatDate, formatShortDate, formatDateTimeReadable } from '$lib/dateUtils.js';

export let data: EventData;

  let currentDate: string = '';
  let allDates: string[] = [];
  let index: number = 0;
  let playing = false;
  let timer: ReturnType<typeof setTimeout>;
  let eventCount: number = 0;
  let distinctLocationCount: number = 0;
  let uniqueEvents: { name: string, count: number }[] = [];
  let histogramData: { date: string, locationCount: number }[] = [];
  let systemTodayDate: string = '';

  let selectedEventNames: Set<string> = new Set();
  let infoPanelVisible = false;
  let eventsFilterVisible = false;

  // State for repeating actions
  let repeatTimer: ReturnType<typeof setTimeout> | null = null;
  let isRepeatingAction: boolean = false;
  let currentRepeatDirection: 'next' | 'prev' | null = null;
  const INITIAL_REPEAT_DELAY = 400; // ms
  const REPEAT_INTERVAL = 80;    // ms

  function toggleEventsFilterVisibility() {
    eventsFilterVisible = !eventsFilterVisible;
    if (eventsFilterVisible && infoPanelVisible) {
      infoPanelVisible = false;
    }
  }

  function handleDateSelectFromSlider(selectedDate: string) {
    const newIndex = allDates.indexOf(selectedDate);
    if (newIndex !== -1) {
      index = newIndex;
    }
  }

  function toggleInfoPanelVisibility() {
    infoPanelVisible = !infoPanelVisible;
    if (infoPanelVisible && eventsFilterVisible) {
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

    const numEvents = (data.events[currentDate] || []).length;
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

  function togglePlayback() {
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
    }
  }

  function prevDate() {
    if (allDates.length > 0) {
      index = (index - 1 + allDates.length) % allDates.length;
    }
  }

  function stopDateRepeat() {
    if (repeatTimer) {
      clearTimeout(repeatTimer);
      repeatTimer = null;
    }
    isRepeatingAction = false;
    currentRepeatDirection = null;
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
      toggleInfoPanelVisibility();
    } else if (event.key === 'Escape' || event.code === 'Escape') {
      event.preventDefault();
      if (infoPanelVisible) {
        infoPanelVisible = false;
      }
      if (eventsFilterVisible) {
        eventsFilterVisible = false;
      }
    } else if (!playing) {
      if (event.key === 'ArrowLeft' || event.code === 'ArrowLeft') {
        if (!event.repeat) {
          event.preventDefault();
          prevDate(); // Immediate action for keydown
          startDateRepeat('prev'); // Setup repeat
        }
      } else if (event.key === 'ArrowRight' || event.code === 'ArrowRight') {
        if (!event.repeat) {
          event.preventDefault();
          nextDate(); // Immediate action for keydown
          startDateRepeat('next'); // Setup repeat
        }
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

  onMount(async () => {
    if (browser) {
      const visitedCookie = document.cookie.split('; ').find(row => row.startsWith('infoPanelVisited='));
      if (!visitedCookie) {
        infoPanelVisible = true;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `infoPanelVisited=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      } else {
        infoPanelVisible = false;
      }
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
  });

  function handleDocumentClick(event: MouseEvent) {
    if (!browser) return;

    const target = event.target as HTMLElement;

    const isClickInsideToolbar = target.closest('.toolbar');
    const isClickInsideInfoPanel = target.closest('.help-panel'); // Renamed class
    const isClickInsideEventsFilter = target.closest('.events-filter-wrapper');
    const isClickInsideSlider = target.closest('.bottom-panel-container');

    if (!isClickInsideToolbar && !isClickInsideInfoPanel && !isClickInsideEventsFilter && !isClickInsideSlider) {
      if (infoPanelVisible) {
        infoPanelVisible = false;
      }
      if (eventsFilterVisible) {
        eventsFilterVisible = false;
      }
    }
  }

  $: if (allDates.length > 0 && data && data.events) {
    currentDate = allDates[index];
    selectedEventNames = new Set();
    const currentDayEvents = data?.events?.[currentDate] || [];
    eventCount = currentDayEvents.length;

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
</script>

<style>
  @import "./page-styles.css";
</style>

{#if data && data.events && data.locations}
  <MapDisplay eventData={data} {currentDate} {selectedEventNames} />
  
  <div class="unified-top-center-box">
    <div class="top-center-container">
      <div class="top-center-main-panel">
        <h3 class="main-title">
          Known Protests
          {#if allDates.length > 0}
            {formatShortDate(allDates[0])}-{formatShortDate(allDates[allDates.length - 1])}
          {/if}
        </h3>
        <div class="attribution-link">
          <i>Provided by <a
            href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
            target="_blank"
            title={data?.updatedAt ? `Last updated: ${formatDateTimeReadable(String(data.updatedAt))}` : 'Source data'}
          >We (the People) Dissent</a></i>
        </div>
      </div>
    </div>
    {#if eventsFilterVisible && uniqueEvents.length > 0 }
      <div class="events-filter-wrapper">
        <EventsFilter {uniqueEvents} {selectedEventNames} onSelectEventFilter={selectEventFilter} {currentDate} {formatDate} onClose={() => eventsFilterVisible = false} />
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
    <button class="icon-button info-toggle-button" on:click={toggleInfoPanelVisibility} title="Show Information Panel (I)" aria-label="Show Information Panel (I)">
      {'ⓘ'}
    </button>
  </div>
  
  {#if histogramData.length > 0 && currentDate}
    <div class="bottom-panel-container">
      <EventInfo
        {currentDate}
        {formatDate}
        displayedEventNameCount={uniqueEvents.filter(e => e.name && e.name.trim() !== '').length}
        {distinctLocationCount}
        allEventNames={uniqueEvents.map(e => e.name).filter(name => name && name.trim() !== '').join(', ')}
      />
      <DateHistogramSlider
        {histogramData}
        {currentDate}
        {systemTodayDate}
        onDateSelect={handleDateSelectFromSlider}
        onPrev={prevDate}
        onNext={nextDate}
        onStartRepeatPrev={() => startDateRepeat('prev')}
        onStartRepeatNext={() => startDateRepeat('next')}
        onStopRepeat={stopDateRepeat}
      />
    </div>
  {/if}

  <HelpPanel visible={infoPanelVisible} onClose={toggleInfoPanelVisibility} />
{/if}
