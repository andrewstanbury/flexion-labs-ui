import { fireEvent, render } from '@testing-library/react-native';
import { NavigationSection, type NavSectionTab } from '../NavigationSection';

type Key = 'a' | 'b' | 'c' | 'settings';

const TABS: NavSectionTab<Key>[] = [
  { key: 'a', label: 'Alpha', icon: 'home-outline' },
  { key: 'b', label: 'Bravo', icon: 'body-outline' },
  { key: 'c', label: 'Charlie', icon: 'stats-chart-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];
const ALWAYS_VISIBLE: readonly Key[] = ['settings'];

describe('<NavigationSection />', () => {
  it('renders rows in the given order, not the tabs prop order', () => {
    const { getAllByTestId } = render(
      <NavigationSection
        tabs={TABS}
        alwaysVisible={ALWAYS_VISIBLE}
        order={['c', 'a', 'settings', 'b']}
        hidden={{}}
        toggleTab={jest.fn()}
        moveTab={jest.fn()}
        reset={jest.fn()}
        testID="nav"
      />,
    );
    const rowTestIDs = getAllByTestId(/^nav-row-/).map((el) => el.props.testID);
    expect(rowTestIDs).toEqual(['nav-row-c', 'nav-row-a', 'nav-row-settings', 'nav-row-b']);
  });

  it('pressing a row switch calls toggleTab with that tab\'s key', () => {
    const toggleTab = jest.fn();
    const { getByLabelText } = render(
      <NavigationSection
        tabs={TABS}
        alwaysVisible={ALWAYS_VISIBLE}
        order={['a', 'b', 'c', 'settings']}
        hidden={{}}
        toggleTab={toggleTab}
        moveTab={jest.fn()}
        reset={jest.fn()}
      />,
    );
    fireEvent(getByLabelText('Bravo'), 'valueChange', false);
    expect(toggleTab).toHaveBeenCalledWith('b');
  });

  it('pressing the up/down arrows calls moveTab with the right direction', () => {
    const moveTab = jest.fn();
    const { getByLabelText } = render(
      <NavigationSection
        tabs={TABS}
        alwaysVisible={ALWAYS_VISIBLE}
        order={['a', 'b', 'c', 'settings']}
        hidden={{}}
        toggleTab={jest.fn()}
        moveTab={moveTab}
        reset={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Move Bravo up'));
    expect(moveTab).toHaveBeenCalledWith('b', 'up');
    fireEvent.press(getByLabelText('Move Bravo down'));
    expect(moveTab).toHaveBeenCalledWith('b', 'down');
  });

  it('shows an explanatory subtitle on an always-visible tab', () => {
    const { getByText } = render(
      <NavigationSection
        tabs={TABS}
        alwaysVisible={ALWAYS_VISIBLE}
        order={['a', 'b', 'c', 'settings']}
        hidden={{}}
        toggleTab={jest.fn()}
        moveTab={jest.fn()}
        reset={jest.fn()}
      />,
    );
    expect(getByText('Always visible')).toBeTruthy();
  });

  it('the reset row calls reset when pressed', () => {
    const reset = jest.fn();
    const { getByText } = render(
      <NavigationSection
        tabs={TABS}
        alwaysVisible={ALWAYS_VISIBLE}
        order={['a', 'b', 'c', 'settings']}
        hidden={{ a: true }}
        toggleTab={jest.fn()}
        moveTab={jest.fn()}
        reset={reset}
      />,
    );
    fireEvent(getByText('Show all tabs'), 'valueChange', true);
    expect(reset).toHaveBeenCalled();
  });
});
