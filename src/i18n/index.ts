/**
 * Minimal i18n entrypoint. For now we only ship Russian strings
 * but keep the API extensible to add locales later.
 */

import { ru } from './ru';

export type LocaleBundle = typeof ru;

export function getStrings(_lang?: string): LocaleBundle {
  // We default to Russian for now; future: switch based on _lang
  return ru;
}

export function formatTemplate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : _match;
  });
}

