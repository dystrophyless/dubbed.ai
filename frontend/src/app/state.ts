import { create } from 'zustand';
import type { Locale } from '../services/contracts';

function localeFromLocation(): Locale {
  return new URLSearchParams(window.location.search).get('locale') === 'ru' ? 'ru' : 'en';
}

interface WorkspaceUiState {
  locale: Locale;
  setLocale(locale: Locale): void;
}

export const useWorkspaceUiStore = create<WorkspaceUiState>((set) => ({
  locale: localeFromLocation(),
  setLocale: (locale) => set({ locale }),
}));
