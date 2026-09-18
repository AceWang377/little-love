const paths: Record<string, string> = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.5 14.2A9 9 0 0 1 9.8 3.5 9 9 0 1 0 20.5 14.2Z"/>',
  flower: '<path d="M12 8C3-3-2 10 8 12-3 21 10 26 12 16c9 11 14-2 4-4C27 3 14-2 12 8Z"/><circle cx="12" cy="12" r="2"/>',
  crown: '<path d="m3 6 4 4 5-7 5 7 4-4-2 13H5ZM5 22h14"/>',
  star: '<path d="m12 2 3.1 6.3 7 .9-5.1 4.9 1.2 6.9-6.2-3.3L5.8 21 7 14.1 1.9 9.2l7-.9Z"/>',
  coffee: '<path d="M18 8h1a3 3 0 1 1 0 6h-1M3 8h15v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v2m4-2v2m4-2v2"/>',
  music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
};
export const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.heart}</svg>`;
