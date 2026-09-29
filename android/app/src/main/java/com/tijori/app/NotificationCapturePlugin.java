package com.tijori.app;

import android.content.Intent;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

@CapacitorPlugin(name = "NotificationCapture")
public class NotificationCapturePlugin extends Plugin {

    @PluginMethod
    public void isListenerEnabled(PluginCall call) {
        boolean enabled = NotificationManagerCompat
            .getEnabledListenerPackages(getContext())
            .contains(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openListenerSettings(PluginCall call) {
        Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getCaptured(PluginCall call) {
        Long sinceObj = call.getLong("since", 0L);
        long since = sinceObj != null ? sinceObj : 0L;

        JSONArray items = NotificationCaptureStore.getSince(getContext(), since);
        JSObject ret = new JSObject();
        try {
            ret.put("items", items);
        } catch (JSONException e) {
            call.reject("Failed to read captured notifications", e);
            return;
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void markProcessedUpTo(PluginCall call) {
        Long tsObj = call.getLong("ts", 0L);
        long ts = tsObj != null ? tsObj : 0L;
        NotificationCaptureStore.pruneUpTo(getContext(), ts);
        call.resolve();
    }
}
