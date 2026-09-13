import { Platform } from "react-native";
import Purchases, { type CustomerInfo, type PurchasesOffering } from "react-native-purchases";

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";

/**
 * No RevenueCat key configured yet? Rather than crash on native module init
 * (which needs a real key + store setup), fall back to a mock "always free"
 * mode so the rest of the app is fully runnable/testable before you've set
 * up App Store Connect / Play Console + RevenueCat.
 */
const apiKey = Platform.select({ ios: IOS_KEY, android: ANDROID_KEY, default: "" });
const MOCK_MODE = !apiKey;

let configured = false;

function ensureConfigured() {
  if (MOCK_MODE || configured) return;
  Purchases.configure({ apiKey: apiKey! });
  configured = true;
}

export async function isPro(): Promise<boolean> {
  if (MOCK_MODE) return false;
  ensureConfigured();
  try {
    const info = await Purchases.getCustomerInfo();
    return hasProEntitlement(info);
  } catch (err) {
    console.warn("[subscriptions] getCustomerInfo failed:", err);
    return false;
  }
}

function hasProEntitlement(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined";
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  if (MOCK_MODE) return null;
  ensureConfigured();
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (err) {
    console.warn("[subscriptions] getOfferings failed:", err);
    return null;
  }
}

export async function purchasePackage(pkg: NonNullable<PurchasesOffering["availablePackages"][number]>): Promise<boolean> {
  if (MOCK_MODE) return false;
  ensureConfigured();
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasProEntitlement(customerInfo);
  } catch (err: any) {
    if (!err?.userCancelled) {
      console.warn("[subscriptions] purchasePackage failed:", err);
    }
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (MOCK_MODE) return false;
  ensureConfigured();
  try {
    const info = await Purchases.restorePurchases();
    return hasProEntitlement(info);
  } catch (err) {
    console.warn("[subscriptions] restorePurchases failed:", err);
    return false;
  }
}

export const subscriptionsMockMode = MOCK_MODE;
