import { registerPlugin, Capacitor } from "@capacitor/core";

export type CapturedNotification = { pkg: string; text: string; ts: number };

interface NotificationCapturePluginType {
  isListenerEnabled(): Promise<{ enabled: boolean }>;
  openListenerSettings(): Promise<void>;
  getCaptured(options: { since: number }): Promise<{ items: CapturedNotification[] }>;
  markProcessedUpTo(options: { ts: number }): Promise<void>;
}

const NotificationCapture = registerPlugin<NotificationCapturePluginType>("NotificationCapture");

export function isNotificationCaptureSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function isListenerEnabled(): Promise<boolean> {
  if (!isNotificationCaptureSupported()) return false;
  const { enabled } = await NotificationCapture.isListenerEnabled();
  return enabled;
}

export async function openListenerSettings(): Promise<void> {
  await NotificationCapture.openListenerSettings();
}

export async function getCapturedNotifications(since: number): Promise<CapturedNotification[]> {
  const { items } = await NotificationCapture.getCaptured({ since });
  return items;
}

export async function markNotificationsProcessedUpTo(ts: number): Promise<void> {
  await NotificationCapture.markProcessedUpTo({ ts });
}
