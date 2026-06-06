import { renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useHaptic } from '../useHaptic';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 0));

describe('useHaptic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fires a success notification when enabled', async () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current();
    await flushMicrotasks();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('does nothing when disabled', async () => {
    const { result } = renderHook(() => useHaptic(false));
    result.current();
    await flushMicrotasks();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('fires a light impact for the light kind', async () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current('light');
    await flushMicrotasks();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });
});
