import type { ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { Sidebar } from '../Sidebar';
import { useSidebarStore } from '../../hooks/useSidebarStore';
import type { TabConfig } from '../TabBar';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 1024, height: 768 },
  insets: { top: 24, left: 0, right: 0, bottom: 34 },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
);

const TABS: Record<string, TabConfig> = {
  'home/index': { active: 'home', inactive: 'home-outline', label: 'Home' },
  'settings/index': { active: 'settings', inactive: 'settings-outline', label: 'Settings' },
};

const STATE = {
  index: 0,
  routes: [
    { key: 'home', name: 'home/index' },
    { key: 'settings', name: 'settings/index' },
  ],
};

function makeNav() {
  return {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
}

describe('<Sidebar />', () => {
  it('shows labels and navigates to a tapped tab when expanded', () => {
    useSidebarStore.getState().setCollapsed(false);
    const navigation = makeNav();
    const { getByText } = render(<Sidebar state={STATE} navigation={navigation} tabs={TABS} />, { wrapper });

    expect(getByText('Home')).toBeTruthy();
    fireEvent.press(getByText('Settings'));
    expect(navigation.navigate).toHaveBeenCalledWith('settings/index');
  });

  it('does not re-navigate to the already-focused tab', () => {
    useSidebarStore.getState().setCollapsed(false);
    const navigation = makeNav();
    const { getByText } = render(<Sidebar state={STATE} navigation={navigation} tabs={TABS} />, { wrapper });

    fireEvent.press(getByText('Home')); // index 0 is focused
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('hides labels when collapsed', () => {
    useSidebarStore.getState().setCollapsed(true);
    const navigation = makeNav();
    const { queryByText } = render(<Sidebar state={STATE} navigation={navigation} tabs={TABS} />, { wrapper });

    expect(queryByText('Home')).toBeNull();
    expect(queryByText('Settings')).toBeNull();
  });
});
