// src/lib/icons.ts

export const playIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display: block; margin: auto;"><path d="M8 5v14l11-7z"/></svg>`;
export const pauseIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display: block; margin: auto;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
export const filterIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display: block; margin: auto;"><path d="M3 6h18L14 14v6h-4v-6L3 6z"/></svg>`;

export const fullscreenEnterIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
</svg>
`;

export const fullscreenExitIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
</svg>
`;

export const infoIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
</svg>
`;

export const markerSvg = `
<svg version="1.1" viewBox="0 0 1200 1200"
  xmlns="http://www.w3.org/2000/svg" width="100%"
  height="100%">
  <path fill="currentColor"
    d="m706.2 740.23 20.438-76.117-33.047-9.1328-37.199-238.98 2.1836-8.0391c5.6641-20.004 26.09-31.957 46.105-26.305l91.32 24.59 11.746-43.488 56.746 15.203-11.746 43.488 106.12 28.5c20.004 5.6523 31.957 26.074 26.52 46.078l-50.004 185.27c-5.2188 20.004-25.656 31.754-45.875 26.52l-106.33-28.465-39.793 147.85-56.52-15.227 6.3008-23.496z" />
  <path fill="currentColor"
    d="m537.67 814.37 3.9102 24.781 18.926 121.33-78.059 12.191-18.707-121.57-3.9102-24.574-3.6953-24.77-101.33 15.648c-16.512 2.6172-31.297-9.5508-34.141-26.52l-60.648-391.62c-2.6211-17.188 8.457-33.266 24.547-35.664l101.1-15.852-3.9102-24.359-3.6953-24.793-0.44531-3.0352 77.844-11.953 0.66016 3.0586 3.6953 24.742 3.6953 24.383 97.43-15.023c1.5-0.21484 3.0352-0.21484 4.5586-0.21484 14.352 0 27.18 11.531 29.555 26.746l29.375 187.88 16.297 105.66 15.227 98.293c1.0781 8.4727-0.86328 16.945-5.6758 23.699-4.3203 6.5273-11.09 10.668-18.91 11.965l-97.402 15.012z" />
</svg>
`;

export const backArrowSvg = `
<svg width="22" height="19" stroke="currentColor" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.48 0.84C17.24 0.84 21.08 4.68 21.08 9.44C21.08 14.2 17.24 18.04 12.48 18.04C8.7 18.04 6.36 15.7 5.64 14.64L6.7 13.7C8.14 15.64 10.28 16.62 12.48 16.62C16.46 16.62 19.66 13.42 19.66 9.44C19.66 5.46 16.46 2.26 12.48 2.26C8.52 2.26 5.3 5.46 5.3 9.44V9.46C6.02 8.84 7.1 8.2 8.48 7.54V8.7C6.86 10.1 5.64 11.58 4.88 13.1H4.3C3.54 11.58 2.34 10.1 0.7 8.7V7.54C2.1 8.2 3.18 8.84 3.88 9.46V9.44C3.88 4.68 7.72 0.84 12.48 0.84Z" fill="black"/>
</svg>
`;

export const circledMarkerSvg = `
<svg version="1.1" viewBox="0 0 1200 1200"
  xmlns="http://www.w3.org/2000/svg" width="100%"
  height="100%">
  <circle
    cx="600" cy="600" r="550"
    fill="currentColor"
    stroke="none"
    stroke-width="80"
    fill-opacity=".1"
  />
  <circle
    cx="600" cy="600" r="550"
    fill="none"
    stroke="currentColor"
    stroke-width="80"
    stroke-opacity=".4"
  />
  <path fill="currentColor"
    fill-opacity="var(--background-opacity, 1)"
    d="m706.2 740.23 20.438-76.117-33.047-9.1328-37.199-238.98 2.1836-8.0391c5.6641-20.004 26.09-31.957 46.105-26.305l91.32 24.59 11.746-43.488 56.746 15.203-11.746 43.488 106.12 28.5c20.004 5.6523 31.957 26.074 26.52 46.078l-50.004 185.27c-5.2188 20.004-25.656 31.754-45.875 26.52l-106.33-28.465-39.793 147.85-56.52-15.227 6.3008-23.496z" />
  <path fill="currentColor"
    fill-opacity="var(--background-opacity, 1)"
    d="m537.67 814.37 3.9102 24.781 18.926 121.33-78.059 12.191-18.707-121.57-3.9102-24.574-3.6953-24.77-101.33 15.648c-16.512 2.6172-31.297-9.5508-34.141-26.52l-60.648-391.62c-2.6211-17.188 8.457-33.266 24.547-35.664l101.1-15.852-3.9102-24.359-3.6953-24.793-0.44531-3.0352 77.844-11.953 0.66016 3.0586 3.6953 24.742 3.6953 24.383 97.43-15.023c1.5-0.21484 3.0352-0.21484 4.5586-0.21484 14.352 0 27.18 11.531 29.555 26.746l29.375 187.88 16.297 105.66 15.227 98.293c1.0781 8.4727-0.86328 16.945-5.6758 23.699-4.3203 6.5273-11.09 10.668-18.91 11.965l-97.402 15.012z" />
</svg>
`;

export const arrowSvg = `
<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 0L20 10L10 20L10 10L0 10L10 0Z"/>
</svg>
`;
