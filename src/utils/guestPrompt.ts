import { Alert } from 'react-native';
import type { TranslationKey } from '../i18n/AppLanguage';

type GuestPromptKind = 'bind' | 'membership';

export function alertGuestRequiresLogin(
  kind: GuestPromptKind,
  t: (key: TranslationKey) => string,
  goToLogin: () => void
) {
  const bodyKey: TranslationKey = kind === 'bind'
    ? 'login.guestBindBody'
    : 'login.guestMembershipBody';
  Alert.alert(
    t('login.guestRequiredTitle'),
    t(bodyKey),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('login.guestRequiredOk'), onPress: goToLogin },
    ]
  );
}
