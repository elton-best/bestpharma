<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
 caisse: 'M3 7h18v14H3z M7 3h10v4 M7 12h3 M14 12h3 M7 16h3 M14 16h3',
 flask: 'M9 3h6 M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3 M7 15h10',
 finance: 'M3 21h18 M5 21V10 M10 21V10 M14 21V10 M19 21V10 M2 7l10-5 10 5z',
 support: 'M4 13v-3a8 8 0 0 1 16 0v3 M4 12H2v6h4v-6z M20 12h2v6h-4v-6z M18 18v3h-6',
 settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
 calendar: 'M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16',
 dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 quality: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',
 documents: 'M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h6',
 team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
 box: 'm3 7 9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5 M12 12v10 M7 4l10 5',
 arrow: 'M7 17 17 7 M7 7h10v10',
 plus: 'M12 5v14 M5 12h14',
 search: 'M21 21l-5-5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
 clock: 'M12 8v4l3 2 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
 check: 'm5 12 4 4L19 6',
 close: 'm6 6 12 12 M6 18 18 6',
 chevron: 'm9 5 7 7-7 7',
 menu: 'M4 6h16 M4 12h16 M4 18h16',
 logout: 'M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4',
 info: 'M12 11v6 M12 7h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
 warning: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 8v5 M12 16h.01',
 bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0',
 user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
 pin: 'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.box" /></svg></template>
