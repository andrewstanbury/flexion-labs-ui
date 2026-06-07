import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UIProvider } from '../../UIProvider';
import { SyncStatusBar } from '../SyncStatusBar';

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

describe('SyncStatusBar', () => {
  it('exposes the current state as its accessible label', () => {
    const { getByLabelText } = wrap(<SyncStatusBar state="offline" pendingCount={2} />);
    expect(getByLabelText('Offline · 2 changes waiting to sync')).toBeTruthy();
  });

  it('reveals the inline detail text on tap', () => {
    const { getByLabelText, queryByText } = wrap(<SyncStatusBar state="saved" />);
    expect(queryByText('All changes saved')).toBeNull();
    fireEvent.press(getByLabelText('All changes saved'));
    expect(queryByText('All changes saved')).toBeTruthy();
  });
});
