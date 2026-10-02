import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/state/useAppStore";
import { analyzePlant, DailyLimitReachedError } from "@/services/api";
import { prepareImage } from "@/services/images";
import { saveScan } from "@/services/storage";
import { recordScanUsed } from "@/services/usageLimiter";
import { showRewardedAd, type RewardedOutcome } from "@/services/ads";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { PlantAnalysis } from "@/types/plant";

const TIPS = ["analyzing.tip1", "analyzing.tip2", "analyzing.tip3", "analyzing.tip4", "analyzing.tip5"] as const;

type Phase = "working" | "locked" | "limit" | "error";

interface Finished {
  uris: string[];
  analysis: PlantAnalysis;
}

export default function Analyzing() {
  const router = useRouter();
  const { t } = useTranslation();
  const imageUris = useAppStore((s) => s.pendingImageUris);
  const needsAd = useAppStore((s) => s.pendingNeedsAd);
  const clearPendingScan = useAppStore((s) => s.clearPendingScan);
  const [phase, setPhase] = useState<Phase>("working");
  const [unlocking, setUnlocking] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const finishedRef = useRef<Finished | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(interval);
  }, []);

  async function openResult({ uris, analysis }: Finished) {
    const record = await saveScan(uris, analysis);
    clearPendingScan();
    router.replace(`/result/${record.id}`);
  }

  useEffect(() => {
    if (imageUris.length === 0) {
      router.replace("/capture");
      return;
    }

    let cancelled = false;

    // The video (when needed) plays *while* Gemini works, so it costs the
    // user no extra waiting — the result is usually ready when it ends.
    const analysis = (async (): Promise<Finished> => {
      const prepared = await Promise.all(imageUris.map(prepareImage));
      const result = await analyzePlant(prepared.map((p) => p.base64));
      await recordScanUsed();
      return { uris: prepared.map((p) => p.uri), analysis: result };
    })();
    const ad: Promise<RewardedOutcome> = needsAd ? showRewardedAd() : Promise.resolve("earned");

    (async () => {
      try {
        const [finished, outcome] = await Promise.all([analysis, ad]);
        if (cancelled) return;
        if (outcome === "skipped") {
          finishedRef.current = finished;
          setPhase("locked");
          return;
        }
        await openResult(finished);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DailyLimitReachedError) {
          setPhase("limit");
        } else {
          console.error(err);
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unlock() {
    const finished = finishedRef.current;
    if (!finished) return;
    setUnlocking(true);
    const outcome = await showRewardedAd();
    setUnlocking(false);
    if (outcome !== "skipped") await openResult(finished);
  }

  if (phase === "locked") {
    return (
      <Message
        emoji="🌿"
        title={t("analyzing.lockedTitle")}
        body={t("analyzing.lockedBody")}
      >
        <PrimaryButton label={t("analyzing.watchUnlock")} onPress={unlock} loading={unlocking} />
        <PrimaryButton
          label={t("analyzing.discard")}
          variant="secondary"
          onPress={() => {
            clearPendingScan();
            router.replace("/");
          }}
        />
      </Message>
    );
  }

  if (phase === "limit") {
    return (
      <Message
        emoji="🌙"
        title={t("analyzing.limitTitle")}
        body={t("analyzing.limitBody")}
      >
        <PrimaryButton label={t("common.backHome")} onPress={() => router.replace("/")} />
      </Message>
    );
  }

  if (phase === "error") {
    return (
      <Message emoji="😕" title={t("analyzing.errorTitle")} body={t("analyzing.errorBody")}>
        <PrimaryButton label={t("analyzing.tryAgain")} onPress={() => router.replace("/capture")} />
        <PrimaryButton label={t("common.backHome")} variant="secondary" onPress={() => router.replace("/")} />
      </Message>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-900 items-center justify-center px-8">
      {imageUris[0] && <Image source={{ uri: imageUris[0] }} className="w-44 h-44 rounded-3xl mb-8 opacity-80" />}
      <ActivityIndicator size="large" color="#fff" />
      <Text className="text-white text-xl font-semibold mt-4 mb-3">{t("analyzing.working")}</Text>
      <Text className="text-leaf-200 text-base text-center">{t(TIPS[tipIndex])}</Text>
    </SafeAreaView>
  );
}

function Message({
  emoji,
  title,
  body,
  children,
}: {
  emoji: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
      <Text className="text-4xl mb-3">{emoji}</Text>
      <Text className="text-xl font-bold text-leaf-900 text-center mb-2">{title}</Text>
      <Text className="text-base text-gray-600 text-center mb-6">{body}</Text>
      <View className="w-full gap-3">{children}</View>
    </SafeAreaView>
  );
}
