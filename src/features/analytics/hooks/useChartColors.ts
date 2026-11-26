import { useSyncExternalStore } from 'react';
import { CHANNELS } from '@/features/orders/types';
import type { Channel } from '@/features/orders/types';

export interface ChartColors {
  channels: Record<Channel, string>;
  series: string;
  grid: string;
  axis: string;
  surface: string;
}

const FALLBACK: ChartColors = {
  channels: { vtex: '#2a78d6', mercadolivre: '#eb6834', magento: '#1baf7a', tray: '#eda100' },
  series: '#2a78d6',
  grid: '#dee2e9',
  axis: '#525b6b',
  surface: '#ffffff',
};

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const getThemeKey = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

let cache: { key: string; colors: ChartColors } | null = null;

function resolveColors(key: string): ChartColors {
  if (cache?.key === key) return cache.colors;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const rgb = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value ? `rgb(${value.split(/\s+/).join(',')})` : fallback;
  };
  const colors: ChartColors = {
    channels: Object.fromEntries(CHANNELS.map((c) => [c, read(`--ch-${c}`, FALLBACK.channels[c])])) as Record<Channel, string>,
    series: read('--ch-vtex', FALLBACK.series),
    grid: rgb('--border', FALLBACK.grid),
    axis: rgb('--fg-muted', FALLBACK.axis),
    surface: rgb('--surface', FALLBACK.surface),
  };
  cache = { key, colors };
  return colors;
}

/**
 * SVG do Recharts recebe cores como atributos, que não resolvem `var()` de
 * forma confiável — então lemos os tokens do tema e reagimos à troca de tema.
 */
export function useChartColors(): ChartColors {
  const key = useSyncExternalStore(subscribe, getThemeKey, () => 'light');
  return resolveColors(key);
}
