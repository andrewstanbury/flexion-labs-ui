import { act, render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { UIProvider } from '../../UIProvider';
import { StatusStrip } from '../StatusStrip';
import { SyncStatusShell } from '../SyncStatusShell';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Async: useReducedMotion reads the OS setting after the first render.
async function wrap(ui: React.ReactElement) {
  const r = render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UIProvider>{ui}</UIProvider>
    </SafeAreaProvider>,
  );
  await act(async () => {});
  return r;
}

describe('StatusStrip', () => {
  it('shows the brand', async () => {
    const { getByText } = await wrap(<StatusStrip state="saved" />);
    expect(getByText('FlexionLabs')).toBeTruthy();
  });

  it('says the state in the sync button’s spoken label', async () => {
    const { getByLabelText } = await wrap(<StatusStrip state="offline" pendingCount={2} />);
    expect(getByLabelText("Offline. 2 changes saved on this phone. They send when you're back online.")).toBeTruthy();
  });

  it('drops the words on press, and closes again', async () => {
    const { getByTestId, queryByTestId, queryByText } = await wrap(<StatusStrip state="saved" />);
    expect(queryByText('All changes saved')).toBeNull();
    fireEvent.press(getByTestId('status-strip-sync'));
    expect(queryByText('All changes saved')).toBeTruthy();
    expect(queryByText("Everything you've done is saved to your account.")).toBeTruthy();
    fireEvent.press(getByTestId('status-strip-scrim'));
    expect(queryByTestId('status-strip-drop')).toBeNull();
  });

  it('counts waiting changes on the button', async () => {
    const { getByTestId, queryByTestId, rerender } = await wrap(<StatusStrip state="syncing" pendingCount={3} />);
    expect(getByTestId('status-strip-badge')).toHaveTextContent('3');
    await act(async () => {});
    rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <UIProvider>
          <StatusStrip state="saved" pendingCount={0} />
        </UIProvider>
      </SafeAreaProvider>,
    );
    expect(queryByTestId('status-strip-badge')).toBeNull();
  });

  it('turns the icon only while syncing', async () => {
    expect((await wrap(<StatusStrip state="syncing" />)).queryByTestId('status-strip-spin')).toBeTruthy();
    expect((await wrap(<StatusStrip state="saved" />)).queryByTestId('status-strip-spin')).toBeNull();
  });

  it('draws the offline line under the strip only while offline', async () => {
    const msg = 'No connection — showing saved data';
    expect((await wrap(<StatusStrip state="offline" offlineMessage={msg} />)).getByText(msg)).toBeTruthy();
    expect((await wrap(<StatusStrip state="saved" offlineMessage={msg} />)).queryByText(msg)).toBeNull();
  });

  it("uses the app's own words", async () => {
    const { getByLabelText } = await wrap(
      <StatusStrip state="saved" describe={() => ({ label: 'Tout est enregistré', detail: 'Rien à envoyer.' })} />,
    );
    expect(getByLabelText('Tout est enregistré. Rien à envoyer.')).toBeTruthy();
  });
});

describe('SyncStatusShell', () => {
  it('draws the strip above the screens when shown', async () => {
    const { getByText, getByTestId } = await wrap(
      <SyncStatusShell state="saved" brand="FlexionLabs">
        <Text>screen</Text>
      </SyncStatusShell>,
    );
    expect(getByText('screen')).toBeTruthy();
    expect(getByTestId('status-strip-sync')).toBeTruthy();
  });

  it('renders the screens untouched when hidden', async () => {
    const { getByText, queryByTestId } = await wrap(
      <SyncStatusShell state="saved" show={false}>
        <Text>screen</Text>
      </SyncStatusShell>,
    );
    expect(getByText('screen')).toBeTruthy();
    expect(queryByTestId('status-strip-sync')).toBeNull();
  });
});
