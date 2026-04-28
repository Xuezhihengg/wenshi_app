import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  value?: 2 | 3;
  index: number;
  flipSeed: number;
};

export function FortuneCoin({ value, index, flipSeed }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const front = value === 3;
  const faceText = value ? (front ? '乾' : '坤') : '卦';
  const [displayText, setDisplayText] = useState(faceText);
  const [displayValue, setDisplayValue] = useState(value);
  const previousFlipSeed = useRef(flipSeed);

  useEffect(() => {
    if (!flipSeed) {
      setDisplayText(faceText);
      setDisplayValue(value);
      labelOpacity.setValue(1);
      return;
    }
    const isNewFlip = previousFlipSeed.current !== flipSeed;
    previousFlipSeed.current = flipSeed;

    if (!isNewFlip) {
      return;
    }

    rotation.setValue(0);
    lift.setValue(0);
    labelOpacity.setValue(1);

    const flipDuration = 760 + index * 90;
    const coinAnimation = Animated.parallel([
      Animated.timing(rotation, {
        toValue: 1,
        duration: flipDuration,
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
    ]);

    const labelAnimation =
      displayText === faceText
        ? Animated.delay(flipDuration)
        : Animated.sequence([
            Animated.delay(Math.round(flipDuration * 0.34)),
            Animated.timing(labelOpacity, {
              toValue: 0,
              duration: 170,
              useNativeDriver: true,
            }),
            Animated.delay(30),
            Animated.timing(labelOpacity, {
              toValue: 1,
              duration: 260,
              useNativeDriver: true,
            }),
          ]);

    Animated.parallel([coinAnimation, labelAnimation]).start();
    if (displayText !== faceText) {
      const switchTimer = setTimeout(() => {
        setDisplayText(faceText);
        setDisplayValue(value);
      }, Math.round(flipDuration * 0.34) + 170);
      return () => clearTimeout(switchTimer);
    }
  }, [displayText, faceText, flipSeed, index, labelOpacity, lift, rotation, value]);

  const rotateY = rotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '540deg', '1080deg'],
  });
  const faceScaleX = rotation.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [1, 0.28, 1, 0.28, 1, 0.28, 1, 0.28, 1],
  });
  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -34],
  });
  const edgeOpacity = rotation.interpolate({
    inputRange: [0, 0.06, 0.125, 0.2, 0.25, 0.31, 0.375, 0.45, 0.5, 0.56, 0.625, 0.7, 0.75, 0.81, 0.875, 0.94, 1],
    outputRange: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
  });
  const edgeScaleX = rotation.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [0.2, 1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2],
  });

  return (
    <Animated.View
      style={[
        styles.stage,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.coinStack}>
        <View style={styles.coinMotionArea}>
          <Animated.View style={[styles.coinRotor, { transform: [{ perspective: 800 }, { rotateY }, { scaleX: faceScaleX }] }]}>
            <View style={[styles.coin, !front && value ? styles.coinBack : null]}>
              <View style={styles.outerRing} />
              <View style={styles.squareHole} />
              <View style={[styles.cut, styles.cutTop]} />
              <View style={[styles.cut, styles.cutRight]} />
              <View style={[styles.cut, styles.cutBottom]} />
              <View style={[styles.cut, styles.cutLeft]} />
            </View>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.coinSide,
              !front && value ? styles.coinBackSide : null,
              { opacity: edgeOpacity, transform: [{ scaleX: edgeScaleX }] },
            ]}
          >
            <View style={styles.coinSideHighlight} />
            <View style={styles.coinSideGroove} />
          </Animated.View>
        </View>
        <Animated.Text
          style={[
            styles.faceText,
            displayValue === 2 ? styles.faceTextBack : null,
            { opacity: labelOpacity },
          ]}
        >
          {displayText}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 92,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinStack: {
    width: 86,
    height: 108,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  coinMotionArea: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  coinRotor: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinSide: {
    position: 'absolute',
    width: 24,
    height: 82,
    borderRadius: 12,
    backgroundColor: '#050505',
    borderWidth: 2,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinBackSide: {
    backgroundColor: '#161616',
    borderColor: '#2a2a2a',
  },
  coinSideHighlight: {
    position: 'absolute',
    left: 5,
    width: 3,
    height: 70,
    borderRadius: 2,
    backgroundColor: '#4a4a4a',
    opacity: 0.9,
  },
  coinSideGroove: {
    position: 'absolute',
    right: 5,
    width: 2,
    height: 66,
    borderRadius: 1,
    backgroundColor: '#000',
    opacity: 0.55,
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
  },
  coinBack: {
    backgroundColor: '#2b2b2b',
  },
  outerRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: '#f4f4f4',
    opacity: 0.78,
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
    marginTop: 8,
    color: '#111',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: 1,
  },
  faceTextBack: {
    color: '#333',
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
  cutBottom: { bottom: 11 },
  cutLeft: { left: 8, transform: [{ rotate: '90deg' }] },
});
