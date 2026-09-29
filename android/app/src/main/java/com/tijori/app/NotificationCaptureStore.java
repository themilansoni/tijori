package com.tijori.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.regex.Pattern;

/** On-device buffer shared between {@link NotificationCaptureListenerService} (writer, runs
 *  whenever the system delivers a notification, even with the app closed) and
 *  {@link NotificationCapturePlugin} (reader, polled from JS while the app is open). Plain
 *  SharedPreferences, capped and pruned so it never grows unbounded even if the JS side never
 *  reads it. */
final class NotificationCaptureStore {
    private static final String PREFS = "notification_capture_store";
    private static final String KEY_ITEMS = "items";
    private static final int MAX_ITEMS = 200;

    // Cheap pre-filter so the buffer only fills up with notifications that look transaction-like
    // (real parsing/rejection happens in the already-tested JS parser) instead of every
    // notification on the device.
    private static final Pattern TRANSACTION_HINT =
        Pattern.compile("(?i)(rs\\.?\\s?\\d|inr\\s?\\d|₹\\s?\\d|\\bdebited\\b|\\bcredited\\b|\\bupi\\b)");

    private NotificationCaptureStore() {}

    static boolean looksLikeTransaction(String text) {
        return text != null && TRANSACTION_HINT.matcher(text).find();
    }

    static synchronized void append(Context context, String pkg, String text, long ts) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray items = readAll(prefs);

        try {
            JSONObject entry = new JSONObject();
            entry.put("pkg", pkg);
            entry.put("text", text);
            entry.put("ts", ts);
            items.put(entry);
        } catch (JSONException e) {
            return;
        }

        while (items.length() > MAX_ITEMS) {
            JSONArray trimmed = new JSONArray();
            for (int i = 1; i < items.length(); i++) {
                try {
                    trimmed.put(items.get(i));
                } catch (JSONException ignored) {
                }
            }
            items = trimmed;
        }

        prefs.edit().putString(KEY_ITEMS, items.toString()).apply();
    }

    static synchronized JSONArray getSince(Context context, long since) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray items = readAll(prefs);
        JSONArray result = new JSONArray();
        for (int i = 0; i < items.length(); i++) {
            try {
                JSONObject entry = items.getJSONObject(i);
                if (entry.getLong("ts") > since) result.put(entry);
            } catch (JSONException ignored) {
            }
        }
        return result;
    }

    static synchronized void pruneUpTo(Context context, long ts) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray items = readAll(prefs);
        JSONArray kept = new JSONArray();
        for (int i = 0; i < items.length(); i++) {
            try {
                JSONObject entry = items.getJSONObject(i);
                if (entry.getLong("ts") > ts) kept.put(entry);
            } catch (JSONException ignored) {
            }
        }
        prefs.edit().putString(KEY_ITEMS, kept.toString()).apply();
    }

    private static JSONArray readAll(SharedPreferences prefs) {
        String raw = prefs.getString(KEY_ITEMS, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }
}
