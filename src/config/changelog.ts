export interface Release {
  version: string;
  date: string;
  features: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.1.1',
    date: 'Apr 2026',
    features: [
      'Pull-to-refresh on mobile — just pull down to reload',
      'IPL team-branded clash cards on the schedule page',
    ],
  },
];

export const CURRENT_VERSION = '1.1.1';
