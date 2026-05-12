import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { DivinationProfile } from '../domain/types';
import { listProfiles, profileInitial, setSelectedProfileId } from '../storage/profileStore';
import { LineIcon } from './LineIcon';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = {
  navigation: {
    navigate: (screen: 'Profile' | 'ArchiveCenter', params?: { profileId?: string }) => void;
  };
};

function relationLabelKey(relation?: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    本人: 'relation.self',
    父母: 'relation.parents',
    子女: 'relation.children',
    伴侣: 'relation.partner',
    亲属: 'relation.relatives',
    朋友: 'relation.friends',
    同事: 'relation.colleagues',
    合作方: 'relation.partnerBusiness',
    客户: 'relation.client',
    其他: 'relation.other',
  };
  return relation ? map[relation] ?? 'relation.other' : 'archive.noRelation';
}

export function ProfileAvatarMenu({ navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profiles, setProfiles] = useState<DivinationProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<DivinationProfile | undefined>();
  const progress = useRef(new Animated.Value(0)).current;
  const backdropProgress = useRef(new Animated.Value(0)).current;

  const refreshProfiles = async () => {
    const loaded = await listProfiles();
    setProfiles(loaded);
    setSelectedProfile((current) => current ? loaded.find((profile) => profile.id === current.id) ?? loaded[0] : loaded[0]);
  };

  useFocusEffect(
    useCallback(() => {
      refreshProfiles();
    }, [])
  );

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

  const selectProfile = async (profile: DivinationProfile) => {
    setSelectedProfile(profile);
    await setSelectedProfileId(profile.id);
    close();
  };

  const avatarOpacity = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropProgress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.layer}>
        <Pressable
          style={[styles.avatarButton, visible ? styles.avatarButtonActive : null, { backgroundColor: visible ? (darkMode ? colors.card : colors.inverse) : colors.control }]}
          onPress={open}
          onLongPress={() => navigation.navigate('Profile')}
          delayLongPress={260}
        >
          {selectedProfile?.avatarUri ? (
            <Animated.Image
              source={{ uri: selectedProfile.avatarUri }}
              resizeMode="cover"
              style={[styles.avatarImage, { opacity: avatarOpacity }]}
            />
          ) : (
            <Animated.Text
              pointerEvents="none"
              style={[
                styles.avatarText,
                {
                  color: visible && !darkMode ? colors.inverseText : colors.text,
                  opacity: avatarOpacity,
                },
              ]}
            >
              {profileInitial(selectedProfile?.name)}
            </Animated.Text>
          )}
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.closeText,
              {
                color: darkMode ? colors.text : colors.inverseText,
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
                backgroundColor: colors.card,
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
              {profiles.map((profile, index) => (
                <View key={profile.name}>
                  <Pressable style={styles.item} onPress={() => selectProfile(profile)}>
                    <View style={[styles.profileOptionAvatar, { backgroundColor: darkMode ? '#2a2a2f' : '#f1f1f1' }]}>
                      {profile.avatarUri ? (
                        <Image source={{ uri: profile.avatarUri }} resizeMode="cover" style={styles.profileOptionAvatarImage} />
                      ) : (
                        <Text style={[styles.profileOptionAvatarText, { color: colors.text }]}>{profileInitial(profile.name)}</Text>
                      )}
                    </View>
                    <View style={styles.itemTextWrap}>
                      <Text numberOfLines={1} style={[styles.text, { color: colors.text }]}>{profile.name}</Text>
                      <Text style={[styles.detail, { color: colors.faintText }]}>{t(relationLabelKey(profile.relation))}</Text>
                    </View>
                    {selectedProfile?.id === profile.id ? <LineIcon name="check" size={16} color={colors.text} /> : null}
                  </Pressable>
                  {index < profiles.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.divider }]} /> : null}
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <Pressable style={[styles.item, language === 'en' ? styles.manageItemEn : null]} onPress={() => navigation.navigate('ArchiveCenter')}>
                <View style={styles.icon}>
                  <LineIcon name="plus" size={language === 'en' ? 17 : 18} color={colors.text} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.text, language === 'en' ? styles.manageTextEn : null, { color: colors.text }]}>{t('archive.manageTitle')}</Text>
                  <Text numberOfLines={2} style={[styles.detail, language === 'en' ? styles.manageDetailEn : null, { color: colors.faintText }]}>{t('archive.manageSubtitle')}</Text>
                </View>
              </Pressable>
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
  avatarImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
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
    width: 190,
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
  manageItemEn: { height: 58, alignItems: 'flex-start', paddingTop: 10, paddingBottom: 9 },
  icon: { width: 22, alignItems: 'center', justifyContent: 'center' },
  profileOptionAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileOptionAvatarImage: { width: 36, height: 36, borderRadius: 18 },
  profileOptionAvatarText: { fontSize: 14, fontWeight: '900', lineHeight: 14 },
  itemTextWrap: { flex: 1 },
  text: { color: '#111', fontSize: 14, fontWeight: '900' },
  detail: { color: '#777', fontSize: 10, fontWeight: '700', marginTop: 2 },
  manageTextEn: { fontSize: 13 },
  manageDetailEn: { fontSize: 10, lineHeight: 13, marginTop: 3 },
  divider: { height: 1, backgroundColor: '#ededed', marginHorizontal: 12 },
});
