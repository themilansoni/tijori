package com.tijori.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/** Declared in AndroidManifest.xml with the {@code BIND_NOTIFICATION_LISTENER_SERVICE} system
 *  permission — not a runtime permission popup. The user grants access to this service from a
 *  dedicated system settings screen (see {@link NotificationCapturePlugin#openListenerSettings}),
 *  which is a different mechanism from the READ_SMS permission that got the sideloaded APK
 *  hard-blocked by Google Play Protect. Whether Play Protect flags this capability too is
 *  untested. */
public class NotificationCaptureListenerService extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getPackageName() == null) return;
        if (sbn.getPackageName().equals(getPackageName())) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (text == null) text = extras.getCharSequence(Notification.EXTRA_TEXT);

        String combined = ((title != null ? title.toString() : "") + "\n" + (text != null ? text.toString() : "")).trim();
        if (combined.isEmpty()) return;
        if (!NotificationCaptureStore.looksLikeTransaction(combined)) return;

        NotificationCaptureStore.append(getApplicationContext(), sbn.getPackageName(), combined, System.currentTimeMillis());
    }
}
