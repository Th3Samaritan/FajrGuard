export interface Prayer {
  id: string;
  name: string;
  arabic: string;
  icon: string;
  emoji: string;
}

export const PRAYERS: Prayer[] = [
  { id: 'fajr',    name: 'Fajr',    arabic: 'الفجر',   icon: 'moon',      emoji: '\u{1F319}' },
  { id: 'dhuhr',   name: 'Dhuhr',   arabic: 'الظهر',   icon: 'sunny',     emoji: '\u{2600}\u{FE0F}' },
  { id: 'asr',     name: 'Asr',     arabic: 'العصر',   icon: 'partly-sunny', emoji: '\u{1F324}\u{FE0F}' },
  { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب',  icon: 'sunset',    emoji: '\u{1F305}' },
  { id: 'isha',    name: 'Isha',    arabic: 'العشاء',  icon: 'night',     emoji: '\u{2728}' },
];

export const PRAYER_NAMES: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

export const PRAYER_ARABIC: Record<string, string> = {
  fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
};
