import { writable, type Writable } from 'svelte/store';
import type { CasePlay } from './types/CasePlay';

export const casePlaysStore: Writable<CasePlay[]> = writable([]);
