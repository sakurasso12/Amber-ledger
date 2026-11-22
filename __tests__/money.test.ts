import { fmtAmount, amountDraft } from '@/lib/money';
import { useSettingsStore } from '@/store/useSettingsStore';

describe('fmtAmount', () => {
  it('keeps whole numbers whole and shows kopecks with a comma', () => {
    useSettingsStore.setState({ settings: { ...useSettingsStore.getState().settings, language: 'uk' } });
    expect(fmtAmount(120)).toBe('120');
    expect(fmtAmount(48048.5)).toBe('48048,50');
    expect(fmtAmount(0.07)).toBe('0,07');
    expect(fmtAmount(-14.3)).toBe('-14,30');
    expect(fmtAmount(-0.001)).toBe('0');
    expect(fmtAmount(1158.333333)).toBe('1158,33');
  });
  it('uses a dot in English', () => {
    useSettingsStore.setState({ settings: { ...useSettingsStore.getState().settings, language: 'en' } });
    expect(fmtAmount(3.5)).toBe('3.50');
  });
  it('prefills inputs without trailing zeros', () => {
    expect(amountDraft(1200)).toBe('1200');
    expect(amountDraft(10.5)).toBe('10.5');
  });
});
