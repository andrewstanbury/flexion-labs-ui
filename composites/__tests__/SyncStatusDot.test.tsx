import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UIProvider } from '../../UIProvider';
import { SyncStatusDot } from '../SyncStatusDot';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UIProvider>{ui}</UIProvider>
    </SafeAreaProvider>,
  );
}

describe('SyncStatusDot', () => {
  it('labels the saved state', () => {
    const { getByLabelText } = wrap(<SyncStatusDot state="saved" />);
    expect(getByLabelText('All changes saved')).toBeTruthy();
  });

  it('shows the pending count (pluralised) when offline', () => {
    const { getByLabelText } = wrap(<SyncStatusDot state="offline" pendingCount={2} />);
    expect(getByLabelText('Offline · 2 changes waiting to sync')).toBeTruthy();
  });

  it('singularises a single change while syncing', () => {
    const { getByLabelText } = wrap(<SyncStatusDot state="syncing" pendingCount={1} />);
    expect(getByLabelText('Syncing 1 change…')).toBeTruthy();
  });

  it('offline with nothing queued reads as saved-on-device', () => {
    const { getByLabelText } = wrap(<SyncStatusDot state="offline" pendingCount={0} />);
    expect(getByLabelText('Offline · changes saved on this device')).toBeTruthy();
  });
});
