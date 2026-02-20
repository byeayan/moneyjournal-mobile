import colors from "@/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Index">;

type Slide = {
  title: string;
  subtitle: string;
  kind: "trust" | "chips" | "feature";
};

const SLIDES: Slide[] = [
  {
    title: "Over 1 Million\nMembers Trust Us",
    subtitle: "Track daily entries, monitor monthly budget, and keep your money story clear.",
    kind: "trust",
  },
  {
    title: "The Easiest way To\nManage Money Daily",
    subtitle: "Choose categories, add notes, and organize spending in seconds.",
    kind: "chips",
  },
  {
    title: "Let MoneyJournal\nWork For You",
    subtitle: "Use analytics and calendar insights to make better financial decisions.",
    kind: "feature",
  },
];

const BULLETS = [
  "No hidden complexity",
  "Fast daily transaction flow",
  "Monthly progress visibility",
];

const CHIPS = ["Budget", "Income", "Expense", "Notes", "Calendar", "Analytics", "Reports", "Goals"];

export default function IndexScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const [nextAnimating, setNextAnimating] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [revealCenter, setRevealCenter] = useState({ x: 0, y: 0 });

  const fade = useRef(new Animated.Value(1)).current;
  const revealScale = useRef(new Animated.Value(1)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<View>(null);
  const nextAnchorRef = useRef<View>(null);

  const slide = useMemo(() => SLIDES[index], [index]);
  const isLast = index === SLIDES.length - 1;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, fade]);

  const computeTargetScale = (cx: number, cy: number) => {
    const radius = 24;
    const { width, height } = containerSize;
    if (!width || !height) return 26;

    const far = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(width - cx, cy),
      Math.hypot(cx, height - cy),
      Math.hypot(width - cx, height - cy)
    );

    return far / radius + 2;
  };

  const runReveal = (onCovered: () => void) => {
    const animateFrom = (cx: number, cy: number) => {
      setRevealCenter({ x: cx, y: cy });
      revealOpacity.setValue(1);
      revealScale.setValue(1);

      Animated.timing(revealScale, {
        toValue: computeTargetScale(cx, cy),
        duration: 320,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onCovered();
        Animated.timing(revealScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          Animated.timing(revealOpacity, {
            toValue: 0,
            duration: 90,
            useNativeDriver: true,
          }).start(() => setNextAnimating(false));
        });
      });
    };

    if (!containerRef.current || !nextAnchorRef.current) {
      animateFrom(containerSize.width - 52, containerSize.height - 56);
      return;
    }

    nextAnchorRef.current.measureInWindow((nx, ny, nw, nh) => {
      containerRef.current?.measureInWindow((sx, sy) => {
        animateFrom(nx - sx + nw / 2, ny - sy + nh / 2);
      });
    });
  };

  const onNext = () => {
    if (nextAnimating) return;

    if (isLast) {
      navigation.navigate("Signup");
      return;
    }

    setNextAnimating(true);
    runReveal(() => setIndex((prev) => prev + 1));
  };

  const onSkip = () => setIndex(SLIDES.length - 1);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -45 && index < SLIDES.length - 1 && !nextAnimating) setIndex((p) => p + 1);
          if (g.dx > 45 && index > 0) setIndex((p) => p - 1);
        },
      }),
    [index, nextAnimating]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View
        ref={containerRef}
        style={styles.container}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setContainerSize({ width, height });
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.reveal,
            {
              opacity: revealOpacity,
              left: revealCenter.x - 24,
              top: revealCenter.y - 24,
              transform: [{ scale: revealScale }],
            },
          ]}
        />

        <Animated.View {...panResponder.panHandlers} style={[styles.content, { opacity: fade }]}> 
          {!isLast ? (
            <View style={styles.skipRow}>
              <TouchableOpacity onPress={onSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.skipSpacer} />
          )}

          <View style={styles.heroBlock}>
            {slide.kind === "trust" ? <Ionicons name="phone-portrait-outline" size={62} color={colors.primary} /> : null}
            {slide.kind === "chips" ? <Ionicons name="grid-outline" size={62} color={colors.primary} /> : null}
            {slide.kind === "feature" ? <Ionicons name="basket-outline" size={62} color={colors.primary} /> : null}
          </View>

          {slide.kind === "chips" ? (
            <View style={styles.tagsWrap}>
              {CHIPS.map((tag, i) => (
                <View key={tag} style={[styles.tag, i % 2 === 0 ? styles.tagA : styles.tagB]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {slide.kind === "feature" ? (
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Build Your Flow</Text>
                <Text style={styles.featureSubtitle}>Add transactions and monitor progress in real time.</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.title}>{slide.title}</Text>

          {slide.kind === "trust" ? (
            <View style={styles.bulletWrap}>
              {BULLETS.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          )}
        </Animated.View>

        <View style={styles.bottomRow}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.nextWrap}>
            {!isLast ? <View ref={nextAnchorRef} style={styles.nextAnchor} /> : null}
            <TouchableOpacity
              style={[styles.nextButton, isLast && styles.nextButtonLast]}
              onPress={onNext}
              disabled={nextAnimating}
            >
              {isLast ? (
                <Text style={styles.nextButtonText}>Get Started</Text>
              ) : (
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isLast ? (
          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLinkText}>I already have an account</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  reveal: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    zIndex: 30,
  },
  skipRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  skipSpacer: {
    height: 27,
    marginBottom: 8,
  },
  skipText: {
    color: colors.light,
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  heroBlock: {
    height: 170,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.light,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  bulletWrap: {
    marginBottom: 8,
    gap: 7,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletText: {
    color: colors.light,
    fontSize: 13,
    fontWeight: "600",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    minWidth: 92,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  tagA: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tagB: {
    backgroundColor: "rgba(101,78,176,0.26)",
  },
  tagText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 10,
    marginBottom: 12,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  featureSubtitle: {
    color: colors.light,
    fontSize: 12,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    width: 18,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  nextWrap: {
    position: "relative",
    minWidth: 52,
    height: 52,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  nextAnchor: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    right: 0,
  },
  nextButton: {
    minWidth: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  nextButtonLast: {
    borderRadius: 14,
    minWidth: 126,
    paddingHorizontal: 20,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  loginLink: {
    alignItems: "center",
    marginTop: 8,
  },
  loginLinkText: {
    color: colors.light,
    fontSize: 13,
    fontWeight: "600",
  },
});
