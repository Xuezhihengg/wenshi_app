import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMoreMenu } from '../components/AppMoreMenu';
import { useAppTheme } from '../theme/AppTheme';
import { ProfileAvatarMenu } from '../components/ProfileAvatarMenu';
import { RootStackParamList } from '../navigation/types';
import { getSelectedProfile } from '../storage/profileStore';
import { useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;
const FLOATING_QUESTION_TEXTS_ZH = [
  // 感情婚姻类
  '他会主动联系我吗？', '我们的缘分有多深？', '这段感情有未来吗？', 'ta是真的爱我吗？', 
  '何时能遇到正缘？', '该不该分手？', '前任会回头吗？', '婚姻能幸福长久吗？',
  '相亲对象适合我吗？', '异地恋会有结果吗？', 'ta心里在想什么？', '会有第三者介入吗？',
  '今年能脱单吗？', '我们的性格合得来吗？', '这段感情有隐瞒吗？', '该不该复合？',
  
  // 事业财运类
  '工作会有变动吗？', '这个项目能成功吗？', '该不该换工作？', '创业能成功吗？',
  '面试能通过吗？', '升职加薪有机会吗？', '同事值得信任吗？', '老板会赏识我吗？',
  '这份合作能成吗？', '副业能赚钱吗？', '投资能获利吗？', '欠款能要回吗？',
  '生意能好转吗？', '这个客户能谈下吗？', '财运何时能好转？', '今年能存下钱吗？',
  '这个行业有前景吗？', '该不该合伙？', '工作压力能减轻吗？', '跳槽时机到了吗？',
  
  // 学业考试类
  '考试能顺利通过吗？', '这次面试能成功吗？', '该选哪个专业？', '学习成绩能提升吗？',
  '考研能上岸吗？', '考证能一次过吗？', '出国留学顺利吗？', '论文能通过吗？',
  '导师会喜欢我吗？', '这个学习方法适合我吗？', '考试能超常发挥吗？', '复习方向对吗？',
  '能考上理想的学校吗？', '学业压力能缓解吗？', '这个培训值得参加吗？', '竞赛能获奖吗？',
  
  // 健康疾病类
  '病情能好转吗？', '这个治疗有效果吗？', '该不该做手术？', '身体能康复吗？',
  '这个医生靠谱吗？', '什么时候能痊愈？', '这个药对症吗？', '检查结果会好吗？',
  '是怀孕了吗？', '什么时候能怀孕？', '备孕要注意什么？', '心理健康能改善吗？',
  '这个养生方法适合我吗？', '疾病能根治吗？', '这个症状严重吗？', '该不该转院？',
  
  // 人际关系类
  '这个朋友可信吗？', '和同事能处好吗？', '领导会针对我吗？', '这个贵人能帮到我吗？',
  '家人能理解我吗？', '这个误会能化解吗？', '小人会影响我吗？', '这个团队合作顺利吗？',
  '社交能带来机遇吗？', '这个人值得深交吗？', '人际关系能改善吗？', '这个矛盾能解决吗？',
  '朋友会背叛我吗？', '如何处理好关系？', '这个圈子适合我吗？', '能交到真朋友吗？',
  
  // 决策选择类
  '该选A还是选B？', '现在该行动吗？', '这个决定正确吗？', '时机成熟了吗？',
  '应该坚持还是放弃？', '这个风险值得冒吗？', '这个方向对吗？', '该不该相信直觉？',
  '这个计划可行吗？', '现在该等待吗？', '这个机会要抓住吗？', '这个承诺能信吗？',
  '这个建议该采纳吗？', '这个诱惑要拒绝吗？', '这个尝试值得吗？', '这个改变是时候吗？',
  
  // 生活日常类
  '丢失的东西能找到吗？', '出行顺利安全吗？', '这个房子能买吗？', '租房能顺利吗？',
  '搬家是好时机吗？', '这个物品该买吗？', '旅行能开心吗？', '这个宠物适合我吗？',
  '今天会有好运吗？', '这个日子适合办事吗？', '这个梦是什么意思？', '家里会有喜事吗？',
  '这个习惯要改变吗？', '这个爱好要坚持吗？', '这个变化是好事吗？', '今年能实现目标吗？',
  
  // 特殊时机类
  '本命年要注意什么？', '犯太岁怎么办？', '水逆会影响我吗？', '什么时候转运？',
  '流年运势如何？', '这个月份顺利吗？', '今天适合做什么？', '这个时辰吉利吗？',
  '犯小人怎么化解？', '财运方位在哪里？', '桃花运何时来？', '贵人何时出现？',
  '什么时候有转机？', '这个阶段能突破吗？', '低谷期还有多久？', '何时能心想事成？',
  
  // 玄学命理类
  '八字合不合？', '姓名吉利吗？', '风水有问题吗？', '手相有玄机吗？',
  '面相如何解读？', '这个卦象怎么看？', '这个签文何解？', '这个占卜准确吗？',
  '命中有财库吗？', '姻缘天注定吗？', '事业有贵人吗？', '健康有隐患吗？',
  '寿命有多长？', '子女缘如何？', '父母健康吗？', '祖上保佑吗？',
  
  // 综合运势类
  '今年的整体运势？', '下个月的运气如何？', '本周会有好事吗？', '今天宜忌是什么？',
  '什么时候能转运？', '这个月能突破吗？', '近期会有意外收获吗？', '什么时候能安定？',
  '人生方向在哪里？', '使命是什么？', '潜能如何发挥？', '天赋在哪里？',
  '什么阻碍了发展？', '需要提升什么？', '如何改变现状？', '怎样才能更幸福？'
];
const FLOATING_QUESTION_TEXTS_EN = [
  'Will they contact me?', 'Is this relationship right?', 'Will we reconcile?', 'When will love arrive?',
  'Should I change jobs?', 'Will this project work?', 'Can I pass the interview?', 'Is this partner reliable?',
  'Will my finances improve?', 'Can I recover the debt?', 'Is this investment wise?', 'Should I start a business?',
  'Will the exam go well?', 'Can I pass the certification?', 'Is this major right?', 'Will my thesis pass?',
  'Will my health improve?', 'Is this treatment effective?', 'Should I have surgery?', 'When will I recover?',
  'Can this conflict resolve?', 'Is this friend trustworthy?', 'Will my family understand?', 'Is there a hidden rival?',
  'Should I choose A or B?', 'Is now the right time?', 'Should I wait?', 'Is this opportunity worth it?',
  'Can the lost item return?', 'Will this trip be safe?', 'Is this house suitable?', 'Should I move now?',
  'Will luck turn around?', 'What should I focus on?', 'Is this month favorable?', 'When will things settle?',
  'Is my name auspicious?', 'Does the feng shui fit?', 'What does this dream mean?', 'Will noble help appear?',
  'What blocks my progress?', 'How can I improve?', 'What is my direction?', 'Will my wish come true?'
];
const FLOATING_QUESTION_COUNT = 10;
const FLOATING_LAYER_WIDTH = 320;
const FLOATING_TEXT_HEIGHT = 18;
const FLOATING_TEXT_GAP = 14;
const FLOATING_TEXT_FONT_SIZE = 11;
const QUESTION_CHARACTER_LIMIT = 80;
const INPUT_TEXT_FONT_SIZE = 16;

type FloatingQuestion = {
  text: string;
  style: {
    left: number;
    top: number;
  };
};
type FloatingRect = { left: number; top: number; width: number; height: number };

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function estimateFloatingTextWidth(text: string) {
  const asciiCount = [...text].filter((character) => character.charCodeAt(0) < 128).length;
  const wideCount = [...text].length - asciiCount;
  return Math.min(FLOATING_LAYER_WIDTH, Math.max(48, wideCount * 12 + asciiCount * 6 + 12));
}

function estimateInputTextWidth(text: string) {
  const asciiCount = [...text].filter((character) => character.charCodeAt(0) < 128).length;
  const wideCount = [...text].length - asciiCount;
  return Math.max(1, Math.min(FLOATING_LAYER_WIDTH, wideCount * INPUT_TEXT_FONT_SIZE + asciiCount * INPUT_TEXT_FONT_SIZE * 0.58));
}

function rectsOverlap(a: FloatingRect, b: FloatingRect) {
  return !(
    a.left + a.width + FLOATING_TEXT_GAP < b.left ||
    b.left + b.width + FLOATING_TEXT_GAP < a.left ||
    a.top + a.height + FLOATING_TEXT_GAP < b.top ||
    b.top + b.height + FLOATING_TEXT_GAP < a.top
  );
}

function randomFloatingPosition(text: string, aboveTitle: boolean): FloatingRect {
  const width = estimateFloatingTextWidth(text);
  const top = aboveTitle ? randomBetween(-132, -46) : randomBetween(82, 174);
  const left = randomBetween(0, Math.max(0, FLOATING_LAYER_WIDTH - width));
  return { left, top, width, height: FLOATING_TEXT_HEIGHT };
}

function randomFloatingText(excludedTexts: Set<string>, sourceTexts: string[]) {
  const candidates = sourceTexts.filter((text) => !excludedTexts.has(text));
  const source = candidates.length ? candidates : sourceTexts;
  return source[Math.floor(Math.random() * source.length)];
}

function createFloatingQuestion(slotIndex: number, occupiedRects: FloatingRect[], occupiedTexts = new Set<string>(), sourceTexts = FLOATING_QUESTION_TEXTS_ZH): FloatingQuestion | undefined {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const text = randomFloatingText(occupiedTexts, sourceTexts);
    const preferAbove = (slotIndex + attempt) % 2 === 0;
    const rect = randomFloatingPosition(text, preferAbove);
    if (!occupiedRects.some((existing) => rectsOverlap(existing, rect))) {
      occupiedRects.push(rect);
      occupiedTexts.add(text);
      return { text, style: { left: rect.left, top: rect.top } };
    }
  }
  return undefined;
}

function createFloatingQuestionSet(sourceTexts = FLOATING_QUESTION_TEXTS_ZH) {
  const occupiedRects: FloatingRect[] = [];
  const occupiedTexts = new Set<string>();
  return Array.from({ length: FLOATING_QUESTION_COUNT }, (_, index) => (
    createFloatingQuestion(index, occupiedRects, occupiedTexts, sourceTexts) ?? { text: '', style: { left: 0, top: 0 } }
  ));
}

function createEnteringCharacterTiming(index: number, totalCharacters: number) {
  const safeTotal = Math.max(1, totalCharacters);
  const appearStart = safeTotal === 1 ? 0 : (index / Math.max(1, safeTotal - 1)) * 0.66;
  const availableDuration = Math.max(0.18, 1 - appearStart - 0.02);
  const goldRiseDuration = Math.min(0.1, availableDuration * 0.24);
  const goldHoldDuration = Math.min(0.22, availableDuration * 0.52);
  const goldFadeDuration = Math.min(0.34, availableDuration * 0.78);
  const blackStartDuration = Math.min(0.2, availableDuration * 0.48);
  const blackEndDuration = Math.min(0.38, availableDuration * 0.9);

  return {
    appearStart,
    goldPeak: appearStart + goldRiseDuration,
    goldHold: appearStart + goldHoldDuration,
    goldEnd: appearStart + goldFadeDuration,
    blackStart: appearStart + blackStartDuration,
    blackEnd: appearStart + blackEndDuration,
  };
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function easeInOutCubic(progress: number) {
  return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function interpolateNumber(value: number, inputRange: number[], outputRange: number[]) {
  if (value <= inputRange[0]) return outputRange[0];
  for (let index = 1; index < inputRange.length; index += 1) {
    if (value <= inputRange[index]) {
      const inputStart = inputRange[index - 1];
      const inputEnd = inputRange[index];
      const outputStart = outputRange[index - 1];
      const outputEnd = outputRange[index];
      const ratio = inputEnd === inputStart ? 1 : (value - inputStart) / (inputEnd - inputStart);
      return outputStart + (outputEnd - outputStart) * ratio;
    }
  }
  return outputRange[outputRange.length - 1];
}

type Rect = { x: number; y: number; width: number; height: number };

export function QuestionScreen({ navigation }: Props) {
  const [question, setQuestion] = useState('');
  const [displayQuestionText, setDisplayQuestionText] = useState('');
  const [enteringQuestionText, setEnteringQuestionText] = useState('');
  const [exitingQuestionText, setExitingQuestionText] = useState('');
  const [isQuestionAnimating, setIsQuestionAnimating] = useState(false);
  const [showQuestionOverlay, setShowQuestionOverlay] = useState(false);
  const [showCastTransitionQuestion, setShowCastTransitionQuestion] = useState(false);
  const [isCastTransitionLocked, setIsCastTransitionLocked] = useState(false);
  const insets = useSafeAreaInsets();
  const { darkMode, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const keyboardFocusProgress = useRef(new Animated.Value(0)).current;
  const previousQuestionProgress = useRef(new Animated.Value(0)).current;
  const nextQuestionProgress = useRef(new Animated.Value(1)).current;
  const inputBreathProgress = useRef(new Animated.Value(0)).current;
  const animationLayerOpacity = useRef(new Animated.Value(1)).current;
  const [baseContentOpacity, setBaseContentOpacity] = useState(1);
  const questionAnimationToken = useRef(0);
  const pendingQuestionText = useRef<string | null>(null);
  const isQuestionAnimatingRef = useRef(false);
  const isCastTransitioning = useRef(false);
  const castTransitionFrame = useRef<number | null>(null);
  const castTransitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputFrameRef = useRef<View>(null);
  const transitionStageRegularTextRef = useRef<Text>(null);
  const transitionStageBoldTextRef = useRef<Text>(null);
  const transitionStageFinalTextRef = useRef<Text>(null);
  const [transitionTextRect, setTransitionTextRect] = useState<Rect | null>(null);
  const titleCharacters = useMemo(() => t('question.title').split(''), [t]);
  const floatingQuestionTexts = language === 'en' ? FLOATING_QUESTION_TEXTS_EN : FLOATING_QUESTION_TEXTS_ZH;
  const [floatingQuestions, setFloatingQuestions] = useState<FloatingQuestion[]>(() => createFloatingQuestionSet(floatingQuestionTexts));
  const titleProgress = useRef<Animated.Value[]>([]).current;
  while (titleProgress.length < titleCharacters.length) titleProgress.push(new Animated.Value(0));
  if (titleProgress.length > titleCharacters.length) titleProgress.splice(titleCharacters.length);
  const floatingProgress = useRef(floatingQuestions.map(() => new Animated.Value(0))).current;
  const activeFloatingRects = useRef<(FloatingRect | undefined)[]>([]);
  const activeFloatingTexts = useRef<(string | undefined)[]>([]);
  const exitingQuestionCharacters = useMemo(() => exitingQuestionText.split(''), [exitingQuestionText]);
  const displayQuestionCharacters = useMemo(() => displayQuestionText.split(''), [displayQuestionText]);
  const enteringQuestionCharacters = useMemo(() => enteringQuestionText.split(''), [enteringQuestionText]);

  const runInputBreath = () => {
    inputBreathProgress.stopAnimation();
    inputBreathProgress.setValue(0);
    Animated.sequence([
      Animated.timing(inputBreathProgress, {
        toValue: 1,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(inputBreathProgress, {
        toValue: 0,
        duration: 620,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  useEffect(() => {
    titleProgress.forEach((progress) => progress.setValue(0));
    Animated.stagger(
      105,
      titleProgress.map((progress) =>
        Animated.timing(progress, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [titleCharacters.length, titleProgress]);

  useEffect(() => {
    let stopped = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    activeFloatingRects.current = [];
    activeFloatingTexts.current = [];

    const runFloatingQuestion = (index: number) => {
      if (stopped) return;
      const progress = floatingProgress[index];
      const startDelay = 350 + Math.random() * 2600;
      const stayDuration = 900 + Math.random() * 1800;
      const timer = setTimeout(() => {
        if (stopped) return;
        const occupiedRects = activeFloatingRects.current.filter(Boolean) as FloatingRect[];
        const occupiedTexts = new Set(activeFloatingTexts.current.filter(Boolean) as string[]);
        const nextQuestion = createFloatingQuestion(index, occupiedRects, occupiedTexts, floatingQuestionTexts);
        if (!nextQuestion) {
          runFloatingQuestion(index);
          return;
        }
        const nextRect = {
          left: nextQuestion.style.left,
          top: nextQuestion.style.top,
          width: estimateFloatingTextWidth(nextQuestion.text),
          height: FLOATING_TEXT_HEIGHT,
        };
        activeFloatingRects.current[index] = nextRect;
        activeFloatingTexts.current[index] = nextQuestion.text;
        setFloatingQuestions((current) => current.map((item, itemIndex) => (itemIndex === index ? nextQuestion : item)));
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 980,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(stayDuration),
          Animated.timing(progress, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          activeFloatingRects.current[index] = undefined;
          activeFloatingTexts.current[index] = undefined;
          if (finished) runFloatingQuestion(index);
        });
      }, startDelay);
      timers.push(timer);
    };

    floatingProgress.forEach((_, index) => runFloatingQuestion(index));
    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      floatingProgress.forEach((progress) => progress.stopAnimation());
      activeFloatingRects.current = [];
      activeFloatingTexts.current = [];
    };
  }, [floatingProgress, floatingQuestionTexts]);

  useEffect(() => {
    setFloatingQuestions(createFloatingQuestionSet(floatingQuestionTexts));
  }, [floatingQuestionTexts]);

  useEffect(() => {
    const show = (event: { endCoordinates: { height: number }; duration?: number }) => {
      const bottomPadding = Math.max(20, insets.bottom + 12);
      const keyboardGap = 4;
      const lift = -Math.max(0, event.endCoordinates.height - bottomPadding + keyboardGap);
      Animated.timing(keyboardLift, {
        toValue: lift,
        duration: event.duration || 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.timing(keyboardFocusProgress, {
        toValue: 1,
        duration: event.duration || 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    const hide = (event: { duration?: number } = {}) => {
      Animated.timing(keyboardLift, {
        toValue: 0,
        duration: event.duration || 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.timing(keyboardFocusProgress, {
        toValue: 0,
        duration: event.duration || 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    const subscriptions = [
      Keyboard.addListener('keyboardWillShow', show),
      Keyboard.addListener('keyboardDidShow', show),
      Keyboard.addListener('keyboardWillHide', hide),
      Keyboard.addListener('keyboardDidHide', hide),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [insets.bottom, keyboardFocusProgress, keyboardLift]);

  useEffect(() => () => {
    if (castTransitionFrame.current !== null) {
      cancelAnimationFrame(castTransitionFrame.current);
      castTransitionFrame.current = null;
    }
    castTransitionTimers.current.forEach(clearTimeout);
    castTransitionTimers.current = [];
  }, []);

  const animateQuestionIntoInput = (text: string) => {
    const nextText = text.slice(0, QUESTION_CHARACTER_LIMIT);

    Haptics.selectionAsync();
    Keyboard.dismiss();

    if (isQuestionAnimatingRef.current) {
      pendingQuestionText.current = nextText;
      return;
    }

    const token = questionAnimationToken.current + 1;
    questionAnimationToken.current = token;

    previousQuestionProgress.stopAnimation();
    nextQuestionProgress.stopAnimation();
    inputBreathProgress.stopAnimation();
    const currentOverlayText = displayQuestionText || question;
    setExitingQuestionText(currentOverlayText);
    setEnteringQuestionText(currentOverlayText ? '' : nextText);
    setDisplayQuestionText(currentOverlayText);
    setShowQuestionOverlay(Boolean(currentOverlayText));
    setIsQuestionAnimating(true);
    isQuestionAnimatingRef.current = true;
    previousQuestionProgress.setValue(0);
    nextQuestionProgress.setValue(0);
    inputBreathProgress.setValue(0);
    animationLayerOpacity.setValue(1);

    runInputBreath();

    Animated.sequence([
      currentOverlayText
        ? Animated.timing(previousQuestionProgress, {
          toValue: 1,
          duration: Math.max(620, currentOverlayText.length * 48),
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        })
        : Animated.delay(0),
      Animated.delay(currentOverlayText ? 90 : 0),
    ]).start(({ finished }) => {
      if (!finished || questionAnimationToken.current !== token) return;
      setQuestion(nextText);
      setExitingQuestionText('');
      setDisplayQuestionText('');
      setEnteringQuestionText(nextText);
      nextQuestionProgress.setValue(0);
      runInputBreath();
      Animated.timing(nextQuestionProgress, {
        toValue: 1,
        duration: Math.max(1500, nextText.length * 92),
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished: nextFinished }) => {
        if (!nextFinished || questionAnimationToken.current !== token) return;
        const queuedText = pendingQuestionText.current;
        pendingQuestionText.current = null;
        if (queuedText && queuedText !== nextText) {
          setQuestion(nextText);
          setShowQuestionOverlay(true);
          setEnteringQuestionText('');
          setExitingQuestionText('');
          setDisplayQuestionText(nextText);
          setIsQuestionAnimating(false);
          isQuestionAnimatingRef.current = false;
          requestAnimationFrame(() => animateQuestionIntoInput(queuedText));
          return;
        }
        setIsQuestionAnimating(false);
        isQuestionAnimatingRef.current = false;
        setShowQuestionOverlay(true);
        setEnteringQuestionText('');
        setDisplayQuestionText(nextText);
      });
    });
  };

  const startCastTransition = () => {
    const castQuestion = question.trim();
    if (!castQuestion || isQuestionAnimating || isCastTransitioning.current) return;
    isCastTransitioning.current = true;
    setIsCastTransitionLocked(true);
    Keyboard.dismiss();
    setShowQuestionOverlay(false);
    setDisplayQuestionText('');
    setEnteringQuestionText('');
    setExitingQuestionText('');

    inputFrameRef.current?.measureInWindow((x, y) => {
      const startRect = {
        x: x + 16,
        y: y + 12,
        width: Math.min(screenWidth - 72, estimateInputTextWidth(castQuestion)),
        height: 22,
      };
      setTransitionTextRect(startRect);
      setShowCastTransitionQuestion(true);
      requestAnimationFrame(() => runCastTransition(castQuestion, startRect));
    });

    const runCastTransition = (currentQuestion: string, startRect: Rect) => {
      const safeHorizontalPadding = 32;
      const finalWidth = screenWidth - safeHorizontalPadding * 2;
      const textLength = Math.max(1, currentQuestion.length);
      const desiredFinalFontSize = 28;
      const maxFontByLength = Math.max(18, Math.min(desiredFinalFontSize, (finalWidth / Math.min(textLength, 18)) * 1.55));
      const finalFontSize = Math.min(desiredFinalFontSize, maxFontByLength);
      const finalLineHeight = Math.round(finalFontSize * 1.38);
      const estimatedTextWidth = Math.min(finalWidth, estimateInputTextWidth(currentQuestion) * (finalFontSize / INPUT_TEXT_FONT_SIZE));
      const estimatedLines = Math.min(4, Math.max(1, Math.ceil(estimatedTextWidth / finalWidth)));
      const finalHeight = finalLineHeight * estimatedLines;
      const finalTextWidth = estimatedLines > 1 ? finalWidth : estimatedTextWidth;
      const hasWrappedFinalText = estimatedLines > 1;
      const finalRect = {
        x: screenWidth / 2 - finalTextWidth / 2,
        y: screenHeight / 2 - finalHeight / 2,
        width: finalTextWidth,
        height: finalHeight,
      };

      const applyCastTransitionProgress = (value: number) => {
        const baseOpacity = interpolateNumber(value, [0, 0.24, 1], [1, 0, 0]);
        const textOpacity = interpolateNumber(value, [0, 0.82, 1], [1, 1, 0]);
        const moveProgress = interpolateNumber(value, [0.24, 0.82], [0, 1]);
        const boldProgress = interpolateNumber(value, [0.54, 0.72], [0, 1]);
        const finalLayoutProgress = hasWrappedFinalText ? interpolateNumber(value, [0.74, 0.82], [0, 1]) : 0;
        const left = startRect.x + (finalRect.x - startRect.x) * moveProgress;
        const top = startRect.y + (finalRect.y - startRect.y) * moveProgress;
        const width = hasWrappedFinalText ? startRect.width : startRect.width + (finalRect.width - startRect.width) * moveProgress;
        const fontSize = 16 + (finalFontSize - 16) * moveProgress;
        const lineHeight = 22 + (finalLineHeight - 22) * moveProgress;
        const sharedStyle = { left, top, width, fontSize, lineHeight, textAlign: 'left' };
        setBaseContentOpacity(baseOpacity);
        transitionStageRegularTextRef.current?.setNativeProps({
          style: {
            ...sharedStyle,
            opacity: textOpacity * (1 - boldProgress) * (1 - finalLayoutProgress),
          },
        });
        transitionStageBoldTextRef.current?.setNativeProps({
          style: {
            ...sharedStyle,
            opacity: textOpacity * boldProgress * (1 - finalLayoutProgress),
          },
        });
        transitionStageFinalTextRef.current?.setNativeProps({
          style: {
            opacity: textOpacity * finalLayoutProgress,
            left: finalRect.x,
            top: finalRect.y,
            width: finalRect.width,
            fontSize: finalFontSize,
            lineHeight: finalLineHeight,
            textAlign: 'center',
          },
        });
      };

      applyCastTransitionProgress(0);

      const animateProgress = (fromValue: number, toValue: number, duration: number, easing: (progress: number) => number) => (
        new Promise<void>((resolve) => {
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const rawProgress = Math.min(1, elapsed / duration);
            const easedProgress = easing(rawProgress);
            applyCastTransitionProgress(fromValue + (toValue - fromValue) * easedProgress);
            if (rawProgress >= 1) {
              castTransitionFrame.current = null;
              resolve();
              return;
            }
            castTransitionFrame.current = requestAnimationFrame(tick);
          };
          castTransitionFrame.current = requestAnimationFrame(tick);
        })
      );

      const wait = (duration: number) => (
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, duration);
          castTransitionTimers.current.push(timer);
        })
      );

      (async () => {
        await animateProgress(0, 0.24, 900, easeOutCubic);
        await animateProgress(0.24, 0.82, 1700, easeInOutCubic);
        await wait(560);
        await animateProgress(0.82, 1, 760, easeInOutCubic);
        const selectedProfile = await getSelectedProfile();
        navigation.navigate('Cast', { question: currentQuestion, profile: selectedProfile });
        requestAnimationFrame(() => {
          applyCastTransitionProgress(0);
          setShowCastTransitionQuestion(false);
          setTransitionTextRect(null);
          isCastTransitioning.current = false;
          setIsCastTransitionLocked(false);
        });
      })();
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
      <Pressable style={styles.dismissArea} onPress={Keyboard.dismiss}>
        <Animated.View
          style={[
            styles.titleWrap,
            {
              opacity: baseContentOpacity,
              transform: [
                {
                  translateY: keyboardFocusProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -72],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.floatingQuestionLayer,
              {
                opacity: keyboardFocusProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            {floatingQuestions.map((item, index) => {
              const progress = floatingProgress[index];
              return (
                <Animated.View
                  key={`${item.text}-${index}`}
                  style={[
                    styles.floatingQuestionButton,
                    item.style,
                    {
                      opacity: progress,
                      transform: [
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.96, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    hitSlop={8}
                    disabled={!item.text}
                    onPress={(event) => {
                      event.stopPropagation();
                      animateQuestionIntoInput(item.text);
                    }}
                  >
                    <Text numberOfLines={1} style={[styles.floatingQuestion, { color: colors.text }]}>{item.text}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
          <View style={[styles.titleSafeArea, { backgroundColor: colors.card }]}>
            <View style={styles.titleRow}>
            {titleCharacters.map((character, index) => {
              const progress = titleProgress[index];
              return (
                <Animated.Text
                  key={`${character}-${index}`}
                  style={[
                    styles.title,
                    {
                      opacity: progress,
                      color: colors.text,
                    },
                  ]}
                >
                  {character}
                </Animated.Text>
              );
            })}
            </View>
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.formPanel,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(10, insets.bottom ),
              transform: [{ translateY: keyboardLift }],
            },
          ]}
        >
          <Pressable style={styles.formInner} onPress={(event) => event.stopPropagation()}>
            <Animated.View
              ref={inputFrameRef}
              style={[
                styles.inputFrame,
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.inputFrameChrome,
                  {
                    backgroundColor: colors.card,
                    opacity: baseContentOpacity,
                    borderColor: inputBreathProgress.interpolate({
                      inputRange: [0, 0.45, 1],
                      outputRange: [colors.text, darkMode ? '#8b6d34' : '#6c5124', '#b98216'],
                    }),
                    shadowOpacity: inputBreathProgress.interpolate({
                      inputRange: [0, 0.45, 1],
                      outputRange: [0, 0.07, 0.2],
                    }),
                    shadowRadius: inputBreathProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 10],
                    }),
                  },
                ]}
              />
              <TextInput
                value={question}
                onChangeText={(text) => {
                  if (isQuestionAnimating) return;
                  setShowQuestionOverlay(false);
                  setDisplayQuestionText('');
                  setEnteringQuestionText('');
                  setExitingQuestionText('');
                  setQuestion(text);
                }}
                placeholder={isQuestionAnimating || question ? '' : t('question.placeholder')}
                placeholderTextColor={colors.faintText}
                style={[styles.input, { color: colors.text }, question ? styles.inputHiddenText : null]}
                multiline
                editable={!isQuestionAnimating && !isCastTransitionLocked}
                pointerEvents={isQuestionAnimating || isCastTransitionLocked ? 'none' : 'auto'}
                onFocus={() => {
                  if (isQuestionAnimating || isCastTransitionLocked) {
                    Keyboard.dismiss();
                    return;
                  }
                  setShowQuestionOverlay(false);
                  setDisplayQuestionText('');
                  setEnteringQuestionText('');
                  setExitingQuestionText('');
                }}
              />
              {question && !isQuestionAnimating && !showQuestionOverlay ? (
                <Animated.View pointerEvents="none" style={[styles.inputMirrorLayer, { opacity: showCastTransitionQuestion ? 0 : 1 }]}>
                  <Text style={[styles.inputMirrorText, { color: colors.text }]}>
                    {question}
                  </Text>
                </Animated.View>
              ) : null}
              {isQuestionAnimating || showQuestionOverlay ? (
                <Animated.View pointerEvents="none" style={[styles.animatedQuestionLayer, { opacity: animationLayerOpacity }]}>
                  {!isQuestionAnimating && showQuestionOverlay ? displayQuestionCharacters.map((character, index) => (
                    <View key={`display-${character}-${index}`} style={styles.animatedCharacterWrap}>
                      <Text style={[styles.animatedQuestionText, styles.animatedCharacterMeasure]}>{character}</Text>
                      <Text style={[styles.animatedQuestionText, styles.displayQuestionText, { color: colors.text }]}>{character}</Text>
                    </View>
                  )) : null}
                  {exitingQuestionCharacters.map((character, index) => {
                    const totalCharacters = Math.max(1, exitingQuestionCharacters.length);
                    const fadeStart = index / (totalCharacters + 3);
                    const fadeEnd = fadeStart + 0.22;
                    const charOpacity = previousQuestionProgress.interpolate({
                      inputRange: [fadeStart, fadeEnd],
                      outputRange: [1, 0],
                      extrapolate: 'clamp',
                    });
                    return (
                      <View key={`exit-${character}-${index}`} style={styles.animatedCharacterWrap}>
                        <Text style={[styles.animatedQuestionText, styles.animatedCharacterMeasure]}>{character}</Text>
                        <Animated.Text style={[styles.animatedQuestionText, styles.previousQuestionText, { color: colors.text, opacity: charOpacity }]}>
                          {character}
                        </Animated.Text>
                      </View>
                    );
                  })}
                  {enteringQuestionCharacters.map((character, index) => {
                    const totalCharacters = Math.max(1, enteringQuestionCharacters.length);
                    const { appearStart, goldPeak, goldHold, goldEnd, blackStart, blackEnd } = createEnteringCharacterTiming(index, totalCharacters);
                    const charProgress = nextQuestionProgress.interpolate({
                      inputRange: [appearStart, goldPeak, goldEnd],
                      outputRange: [0, 1, 1],
                      extrapolate: 'clamp',
                    });
                    const goldOpacity = nextQuestionProgress.interpolate({
                      inputRange: [appearStart, goldPeak, goldHold, goldEnd],
                      outputRange: [0, 1, 1, 0],
                      extrapolate: 'clamp',
                    });
                    const blackOpacity = nextQuestionProgress.interpolate({
                      inputRange: [blackStart, blackEnd],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    });
                    return (
                      <View key={`new-${character}-${index}`} style={styles.animatedCharacterWrap}>
                        <Text style={[styles.animatedQuestionText, styles.animatedCharacterMeasure]}>{character}</Text>
                        <Animated.Text style={[styles.animatedQuestionText, styles.goldQuestionText, { opacity: Animated.multiply(charProgress, goldOpacity) }]}>
                          {character}
                        </Animated.Text>
                        <Animated.Text style={[styles.animatedQuestionText, styles.blackQuestionText, { color: colors.text, opacity: Animated.multiply(charProgress, blackOpacity) }]}>
                          {character}
                        </Animated.Text>
                      </View>
                    );
                  })}
                </Animated.View>
              ) : null}
            </Animated.View>
            <Pressable
              style={[styles.button, { backgroundColor: colors.inverse }, !question.trim() && styles.buttonDisabled, { opacity: baseContentOpacity }]}
              disabled={!question.trim() || isQuestionAnimating || isCastTransitionLocked}
              onPress={startCastTransition}
            >
              <Text style={[styles.buttonText, { color: colors.inverseText }]}>{t('question.start')}</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
      <Animated.View
        pointerEvents={isCastTransitionLocked ? 'none' : 'box-none'}
        style={[styles.topMenuLayer, { opacity: baseContentOpacity }]}
      >
        <ProfileAvatarMenu navigation={navigation} />
        <AppMoreMenu navigation={navigation} currentScreen="Question" />
      </Animated.View>
      {showCastTransitionQuestion && transitionTextRect ? (
        <View pointerEvents="none" style={styles.transitionTextStage}>
          <Text
            ref={transitionStageRegularTextRef}
            style={[
              styles.transitionText,
              {
                color: colors.text,
                opacity: 1,
                left: transitionTextRect.x,
                top: transitionTextRect.y,
                width: transitionTextRect.width,
                fontSize: 16,
                lineHeight: 22,
                fontWeight: '500',
                textAlign: 'left',
              },
            ]}
          >
            {question.trim()}
          </Text>
          <Text
            ref={transitionStageBoldTextRef}
            style={[
              styles.transitionText,
              {
                color: colors.text,
                opacity: 0,
                left: transitionTextRect.x,
                top: transitionTextRect.y,
                width: transitionTextRect.width,
                fontSize: 16,
                lineHeight: 22,
                fontWeight: '800',
                textAlign: 'left',
              },
            ]}
          >
            {question.trim()}
          </Text>
          <Text
            ref={transitionStageFinalTextRef}
            style={[
              styles.transitionText,
              {
                color: colors.text,
                opacity: 0,
                left: transitionTextRect.x,
                top: transitionTextRect.y,
                width: transitionTextRect.width,
                fontSize: 16,
                lineHeight: 22,
                fontWeight: '800',
                textAlign: 'center',
              },
            ]}
          >
            {question.trim()}
          </Text>
        </View>
      ) : null}
      {isCastTransitionLocked ? <Pressable style={styles.interactionBlocker} onPress={Keyboard.dismiss} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  interactionBlocker: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50 },
  topMenuLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40 },
  dismissArea: { flex: 1 },
  titleWrap: { paddingHorizontal: 20, paddingTop: 220, position: 'relative' },
  floatingQuestionLayer: { position: 'absolute', left: 20, top: 220, width: FLOATING_LAYER_WIDTH, height: 210, zIndex: 1 },
  floatingQuestionButton: { position: 'absolute' },
  floatingQuestion: { color: '#111', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  titleSafeArea: { backgroundColor: '#fff', zIndex: 2 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', paddingRight: 52 },
  title: { color: '#000', fontSize: 30, fontWeight: '800', lineHeight: 40 },
  formPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#fff' },
  formInner: { gap: 14 },
  inputFrame: {
    minHeight: 120,
    position: 'relative',
    overflow: 'visible',
  },
  inputFrameChrome: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#b98216',
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    minHeight: 120,
    color: '#000',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  inputHiddenText: { color: 'transparent' },
  inputMirrorLayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 12,
    zIndex: 5,
    elevation: 5,
  },
  inputMirrorText: {
    position: 'absolute',
    left: 0,
    top: 0,
    color: '#000',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  transitionTextStage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  transitionText: {
    position: 'absolute',
    color: '#000',
  },
  animatedQuestionLayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  animatedCharacterWrap: { position: 'relative', minWidth: 0, height: 22 },
  animatedQuestionText: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  animatedCharacterMeasure: { opacity: 0 },
  displayQuestionText: { position: 'absolute', color: '#000' },
  previousQuestionText: { position: 'absolute', color: '#000' },
  goldQuestionText: { position: 'absolute', color: '#c9972b' },
  blackQuestionText: { position: 'absolute', color: '#000' },
  button: {
    height: 52,
    borderRadius: 6,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
