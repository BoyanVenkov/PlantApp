import type { PurchasesOffering } from "react-native-purchases";

/** Web preview: store purchases are mobile-only, so this is always mock mode. */

export async function isAdFree(): Promise<boolean> {
  return false;
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  return null;
}

export async function purchasePackage(_pkg: NonNullable<PurchasesOffering["availablePackages"][number]>): Promise<boolean> {
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}

export const purchasesMockMode = true;
