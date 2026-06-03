import { View } from 'react-native';
import { Modal as RNModal, type ModalProps as RNModalProps } from 'react-native';
import { radius, shadow, space, layout } from '../tokens';
import { useTheme } from '../UIProvider';
import { Header } from './Header';

// Modal.Shell — semi-transparent backdrop + centered card with optional
// modal header. Use for confirmation dialogs, single-action sheets.
//
// Heavier flows that need full-screen presentation should keep using
// expo-router's modal route group instead — Modal.Shell is for in-flow
// dialogs that don't warrant a new route.

export type ModalShellProps = Pick<RNModalProps, 'visible' | 'onRequestClose' | 'animationType'> & {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

function ModalShell({
  visible,
  title,
  onClose,
  onRequestClose,
  animationType = 'fade',
  children,
}: ModalShellProps) {
  const t = useTheme();
  return (
    <RNModal
      visible={visible}
      onRequestClose={onRequestClose ?? onClose}
      animationType={animationType}
      transparent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: layout.screenX,
        }}
      >
        <View
          style={{
            backgroundColor: t.surfaceElevated,
            borderRadius: radius.card,
            overflow: 'hidden',
            ...shadow.modal,
          }}
        >
          {title ? <Header.Modal title={title} onClose={onClose} /> : null}
          <View style={{ padding: space[5] }}>{children}</View>
        </View>
      </View>
    </RNModal>
  );
}

export const Modal = Object.assign({}, { Shell: ModalShell });
