import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  value?: 2 | 3;
  index: number;
  flipSeed: number;
};

export function FortuneCoin({ value, index, flipSeed }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flipSeed) {
      return;
    }
    rotation.setValue(0);
    lift.setValue(0);
    Animated.parallel([
      Animated.timing(rotation, {
        toValue: 1,
        duration: 760 + index * 90,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(lift, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(lift, {
          toValue: 0,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [flipSeed, index, lift, rotation]);

  const rotateY = rotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '540deg', '1080deg'],
  });
  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -34],
  });

  const front = value === 3;
  const faceText = value ? (front ? '乾' : '坤') : '卦';
  const sideText = value ? (front ? '阳' : '阴') : '待';

  return (
    <Animated.View
      style={[
        styles.stage,
        {
          transform: [{ perspective: 800 }, { translateY }, { rotateY }],
        },
      ]}
    >
      <View style={[styles.coin, !front && value ? styles.coinBack : null]}>
        <View style={styles.outerRing} />
        <View style={styles.innerRing} />
        <View style={styles.squareHole} />
        <Text style={styles.faceText}>{faceText}</Text>
        <Text style={styles.sideText}>{sideText}</Text>
        <View style={[styles.cut, styles.cutTop]} />
        <View style={[styles.cut, styles.cutRight]} />
        <View style={[styles.cut, styles.cutBottom]} />
        <View style={[styles.cut, styles.cutLeft]} />
      </View>
      <View style={styles.shadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 92,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#151515',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  coinBack: {
    backgroundColor: '#2b2b2b',
  },
  outerRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#f4f4f4',
    opacity: 0.86,
  },
  innerRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#f4f4f4',
    opacity: 0.64,
  },
  squareHole: {
    position: 'absolute',
    width: 19,
    height: 19,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  faceText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 44,
  },
  sideText: {
    position: 'absolute',
    bottom: 8,
    color: '#f6f6f6',
    fontSize: 12,
    fontWeight: '700',
  },
  cut: {
    position: 'absolute',
    width: 10,
    height: 2,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  cutTop: { top: 11 },
  cutRight: { right: 8, transform: [{ rotate: '90deg' }] },
  cutBottom: { bottom: 17 },
  cutLeft: { left: 8, transform: [{ rotate: '90deg' }] },
  shadow: {
    position: 'absolute',
    bottom: 8,
    width: 56,
    height: 10,
    borderRadius: 28,
    backgroundColor: '#000',
    opacity: 0.12,
  },
});
