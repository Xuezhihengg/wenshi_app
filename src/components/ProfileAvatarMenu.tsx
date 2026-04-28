import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  navigation: {
    navigate: (screen: 'Profile') => void;
  };
};

const PROFILE_OPTIONS = [
  { name: '本人', detail: '默认档案' },
  { name: '家人', detail: '代问档案' },
  { name: '朋友', detail: '咨询对象' },
];

export function ProfileAvatarMenu({ navigation }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(PROFILE_OPTIONS[0]);
  const progress = useRef(new Animated.Value(0)).current;
  const backdropProgress = useRef(new Animated.Value(0)).current;

  const open = () => {
    setMounted(true);
    setVisible(true);
    progress.stopAnimation();
    backdropProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 380,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const close = () => {
    setVisible(false);
    progress.stopAnimation();
    backdropProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(backdropProgress, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  };

  const selectProfile = (profile: typeof PROFILE_OPTIONS[number]) => {
    setSelectedProfile(profile);
    close();
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, { opacity: backdropProgress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.layer}>
        <Pressable
          style={[styles.avatarButton, visible ? styles.avatarButtonActive : null]}
          onPress={open}
          onLongPress={() => navigation.navigate('Profile')}
          delayLongPress={260}
        >
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.avatarText,
              {
                opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] }),
                transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.74] }) }],
              },
            ]}
          >
            {selectedProfile.name.slice(0, 1)}
          </Animated.Text>
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.closeText,
              {
                opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] }),
                transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
              },
            ]}
          >
            ×
          </Animated.Text>
        </Pressable>
        {mounted ? (
          <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
              styles.card,
              {
                opacity: progress,
                transform: [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <Animated.View
              style={{
                opacity: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-3, 0] }) }],
              }}
            >
              {PROFILE_OPTIONS.map((profile, index) => (
                <View key={profile.name}>
                  <Pressable style={styles.item} onPress={() => selectProfile(profile)}>
                    <Text style={styles.icon}>{profile.name.slice(0, 1)}</Text>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.text}>{profile.name}</Text>
                      <Text style={styles.detail}>{profile.detail}</Text>
                    </View>
                    {selectedProfile.name === profile.name ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                  {index < PROFILE_OPTIONS.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)', zIndex: 20, elevation: 20 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, height: 284, zIndex: 34, elevation: 34 },
  avatarButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarButtonActive: { backgroundColor: '#000' },
  avatarText: {
    position: 'absolute',
    width: 40,
    height: 40,
    color: '#111',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 40,
    textAlign: 'center',
    includeFontPadding: false,
  },
  closeText: {
    position: 'absolute',
    top: -1,
    width: 40,
    height: 40,
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 40,
    textAlign: 'center',
    includeFontPadding: false,
  },
  card: {
    position: 'absolute',
    left: 20,
    top: 106,
    width: 170,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  icon: { width: 22, color: '#111', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  itemTextWrap: { flex: 1 },
  text: { color: '#111', fontSize: 14, fontWeight: '900' },
  detail: { color: '#777', fontSize: 10, fontWeight: '700', marginTop: 2 },
  check: { color: '#111', fontSize: 13, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#ededed', marginHorizontal: 12 },
});
