import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/AppTheme';

export type LineIconName =
  | 'home'
  | 'user'
  | 'history'
  | 'settings'
  | 'share'
  | 'save'
  | 'edit'
  | 'check'
  | 'crown'
  | 'invite'
  | 'bell'
  | 'moon'
  | 'language'
  | 'info'
  | 'name'
  | 'gender'
  | 'calendar'
  | 'phone'
  | 'mail'
  | 'atSign'
  | 'wechat'
  | 'apple'
  | 'google'
  | 'lock'
  | 'shield'
  | 'tag'
  | 'camera'
  | 'image'
  | 'message'
  | 'search'
  | 'star'
  | 'plus'
  | 'trash'
  | 'x'
  | 'chevronLeft'
  | 'moreHorizontal'
  | 'chevronDown';

type Props = {
  name: LineIconName;
  size?: number;
  color?: string;
  stroke?: number;
};

const FEATHER_ICON_MAP: Record<LineIconName, keyof typeof Feather.glyphMap> = {
  home: 'home',
  user: 'user',
  history: 'clock',
  settings: 'settings',
  share: 'share-2',
  save: 'archive',
  edit: 'edit-3',
  check: 'check',
  crown: 'award',
  invite: 'user-plus',
  bell: 'bell',
  moon: 'moon',
  language: 'globe',
  info: 'help-circle',
  name: 'tag',
  gender: 'sliders',
  calendar: 'calendar',
  phone: 'phone',
  mail: 'mail',
  atSign: 'at-sign',
  wechat: 'message-circle',
  apple: 'smartphone',
  google: 'chrome',
  lock: 'lock',
  shield: 'shield',
  tag: 'tag',
  camera: 'camera',
  image: 'image',
  message: 'message-square',
  search: 'search',
  star: 'star',
  plus: 'plus',
  trash: 'trash-2',
  x: 'x',
  chevronLeft: 'chevron-left',
  moreHorizontal: 'more-horizontal',
  chevronDown: 'chevron-down',
};

export function LineIcon({ name, size = 22, color, stroke }: Props) {
  const { colors } = useAppTheme();
  return (
    <Feather
      name={FEATHER_ICON_MAP[name]}
      size={size}
      color={color ?? colors.text}
      style={stroke ? { fontWeight: `${Math.round(stroke * 100)}` as 'normal' } : undefined}
    />
  );
}
