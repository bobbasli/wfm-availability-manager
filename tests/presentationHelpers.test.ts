import { describe, expect, it } from 'vitest';
import {
  initialDateRange,
  readUnavailableBlock,
  unavailableSegments,
} from '../src/helpers/calendar';
import {
  activityCodesFromResponse,
  activityColor,
  scheduleSegments,
  scheduleWeekId,
} from '../src/helpers/schedules';

describe('getypeerde presentatiegrens', () => {
  it('weigert onvolledige en ongeldige tijdvakken zonder een bewerkbare default', () => {
    for (const value of [
      null,
      {},
      { timeSpan: { startDate: 'invalid', lengthMinutes: 30 } },
      { timeSpan: { startDate: '2026-11-09T08:00:00Z', lengthMinutes: '30' } },
    ])
      expect(readUnavailableBlock(value)).toBeNull();
    expect(unavailableSegments({ unexpected: [] })).toBeNull();
    expect(unavailableSegments({ entities: [] })).toEqual([]);
  });
  it('behoudt betaalde/onbetaalde editorinhoud, maar geeft geen willekeurige responsevelden door', () => {
    expect(
      readUnavailableBlock({
        id: 'synthetic',
        timeSpan: { startDate: '2026-11-09T08:00:00Z', lengthMinutes: 30 },
        notes: 'Notitie',
        metadata: { private: 'value' },
      }),
    ).toEqual({
      id: 'synthetic',
      timeSpan: { startDate: '2026-11-09T08:00:00Z', lengthMinutes: 30 },
      notes: 'Notitie',
    });
  });
  it('splitst een onbeschikbaar tijdvak op Amsterdamse middernacht', () => {
    const result = unavailableSegments({
      entities: [
        { id: 'synthetic', timeSpan: { startDate: '2026-11-09T22:30:00Z', lengthMinutes: 120 } },
      ],
    });
    expect(result?.map(({ date, from, to }) => ({ date, from, to }))).toEqual([
      { date: '2026-11-09', from: 1410, to: 1440 },
      { date: '2026-11-10', from: 0, to: 90 },
    ]);
  });
  it('normaliseert array-, lijst- en keyed Activity Codes en weigert onbekende structuren', () => {
    const code = { id: 'synthetic', name: 'Training' };
    for (const response of [
      [code],
      { entities: [code] },
      { result: { activityCodes: { synthetic: { name: 'Training' } } } },
    ])
      expect(activityCodesFromResponse(response)).toEqual([code]);
    expect(() => activityCodesFromResponse({ unknown: [] })).toThrow('onbekende structuur');
    expect(activityColor({ color: '123abc' })).toBe('#123abc');
    expect(activityColor({ color: 'url(https://invalid.example)' })).toBeNull();
  });
  it('toont uitsluitend de geselecteerde medewerker, ook met gedeelde roostermetadata', () => {
    const response = {
      result: {
        agentSchedules: [
          {
            user: { id: 'selected' },
            shifts: [
              {
                startDate: '2026-11-09T08:00:00Z',
                lengthMinutes: 60,
                activities: [
                  {
                    activityCodeId: 'training',
                    startDate: '2026-11-09T08:00:00Z',
                    lengthMinutes: 30,
                  },
                ],
              },
            ],
          },
          {
            user: { id: 'other' },
            shifts: [{ startDate: '2026-11-09T08:00:00Z', lengthMinutes: 120 }],
          },
        ],
      },
    };
    const segments = scheduleSegments(response, 'selected', [
      { id: 'training', name: 'Training', color: '#123abc' },
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0].to - segments[0].from).toBe(60);
    expect(segments[1]).toMatchObject({ kind: 'activity', color: '#123abc' });
    expect(scheduleSegments(response, 'missing', [])).toEqual([]);
  });
  it('herkent de echte weekdatum in een selfUri en behoudt vier weken kalendercontext', () => {
    expect(
      scheduleWeekId({
        raw: {
          selfUri:
            '/api/v2/workforcemanagement/businessunits/synthetic/weeks/2026-11-09/schedules/synthetic',
        },
      }),
    ).toBe('2026-11-09');
    expect(scheduleWeekId({ weekId: 'recent' })).toBeNull();
    const { start, end } = initialDateRange();
    expect(new Date(start + 'T12:00:00Z').getUTCDay()).toBe(1);
    expect((Date.parse(end) - Date.parse(start)) / 86400000).toBe(27);
  });
});
