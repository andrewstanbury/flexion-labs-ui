import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { TabBar, type TabConfig } from '../TabBar';
import { Sidebar } from '../Sidebar';
import { tabA11yLabel } from '../TabBadge';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 0, left: 0, right: 0, bottom: 34 },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
);

const STATE = {
  index: 0,
  routes: [
    { key: 'home', name: 'home/index' },
    { key: 'review', name: 'review/index' },
  ],
};

const nav = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };

function tabs(badge?: number): Record<string, TabConfig> {
  return {
    'home/index': { active: 'home', inactive: 'home-outline', label: 'Home' },
    'review/index': { active: 'checkbox', inactive: 'checkbox-outline', label: 'Review', badge },
  };
}

describe('tab badges', () => {
  it.each([
    ['TabBar', TabBar],
    ['Sidebar', Sidebar],
  ])('%s shows a count on the tab that has one, and says it', (_name, Bar) => {
    const { getByTestId, queryByTestId, getByLabelText } = render(
      <Bar state={STATE} navigation={nav} tabs={tabs(3)} />,
      { wrapper },
    );
    expect(getByTestId('tab-badge-review/index')).toHaveTextContent('3');
    expect(queryByTestId('tab-badge-home/index')).toBeNull();
    expect(getByLabelText('Review, 3')).toBeTruthy();
  });

  it('draws nothing for zero and caps at 99+', () => {
    const zero = render(<TabBar state={STATE} navigation={nav} tabs={tabs(0)} />, { wrapper });
    expect(zero.queryByTestId('tab-badge-review/index')).toBeNull();
    zero.unmount();
    const many = render(<TabBar state={STATE} navigation={nav} tabs={tabs(140)} />, { wrapper });
    expect(many.getByTestId('tab-badge-review/index')).toHaveTextContent('99+');
  });

  it('only adds a count to the spoken name when there is one', () => {
    expect(tabA11yLabel('Review')).toBe('Review');
    expect(tabA11yLabel('Review', 0)).toBe('Review');
    expect(tabA11yLabel('Review', 2)).toBe('Review, 2');
  });
});
