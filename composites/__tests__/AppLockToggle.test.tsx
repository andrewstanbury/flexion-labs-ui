import { act, fireEvent, render } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { AppLockToggle } from '../AppLockToggle';

const COPY = {
  title: 'App Lock',
  subtitle: 'Require biometrics to open the app.',
  cannotEnableTitle: 'Can’t turn on App Lock',
  cannotEnableBody: 'Set up a biometric or passcode first.',
  prompt: 'Confirm to turn on App Lock',
  fallbackLabel: 'Use passcode',
  verifyFailedTitle: 'Couldn’t verify',
  verifyFailedBody: 'Something went wrong.',
};

describe('<AppLockToggle />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('turns off immediately, with no authentication check', async () => {
    const setEnabled = jest.fn();
    const { getByRole } = render(
      <AppLockToggle enabled setEnabled={setEnabled} copy={COPY} />,
    );
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', false);
    });
    expect(setEnabled).toHaveBeenCalledWith(false);
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it('turning on requires hardware + enrollment + a successful check first', async () => {
    const setEnabled = jest.fn();
    const { getByRole } = render(
      <AppLockToggle enabled={false} setEnabled={setEnabled} copy={COPY} />,
    );
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: COPY.prompt, fallbackLabel: COPY.fallbackLabel }),
    );
    expect(setEnabled).toHaveBeenCalledWith(true);
  });

  it('never enables when no biometric/passcode is enrolled', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    const setEnabled = jest.fn();
    const { getByRole } = render(
      <AppLockToggle enabled={false} setEnabled={setEnabled} copy={COPY} />,
    );
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(setEnabled).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(COPY.cannotEnableTitle, COPY.cannotEnableBody);
  });

  it('never enables when the authentication check fails', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });
    const setEnabled = jest.fn();
    const { getByRole } = render(
      <AppLockToggle enabled={false} setEnabled={setEnabled} copy={COPY} />,
    );
    await act(async () => {
      fireEvent(getByRole('switch'), 'valueChange', true);
    });
    expect(setEnabled).not.toHaveBeenCalled();
  });
});
