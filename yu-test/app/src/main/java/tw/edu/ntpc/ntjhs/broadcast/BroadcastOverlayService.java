package tw.edu.ntpc.ntjhs.broadcast;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.os.*;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.net.*;
import java.util.*;
import org.json.*;

/**
 * 新泰國中校園無聲廣播系統 - Android IFP 觸控大屏核心服務
 * 架構：純線上網頁版雲端直連（無伺服器，免輸入伺服器 IP，只需設定班級即可執行）
 */
public class BroadcastOverlayService extends Service {
    private static final String CLOUD_POLL_ENDPOINT = "https://broadcast.ntjhs.ntpc.edu.tw/api/poll";
    private WindowManager windowManager;
    private View overlayView;
    private Handler mainHandler;
    private volatile boolean running = true;
    private final int[] backoffSteps = {3000, 6000, 15000, 30000};
    private int failCount = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        mainHandler = new Handler(Looper.getMainLooper());
        startForegroundNotification();
        new Thread(this::longPollingLoop, "NTJHS-CloudPoll").start();
    }

    private void startForegroundNotification() {
        String chId = "ntjhs_silent_broadcast";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(chId, "新泰國中無聲廣播", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
            Notification notif = new Notification.Builder(this, chId)
                .setContentTitle("新泰國中無聲廣播服務運作中")
                .setContentText("已連線線上雲端推播頻道（免伺服器 IP）")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();
            startForeground(101, notif);
        }
    }

    private void longPollingLoop() {
        SharedPreferences prefs = getSharedPreferences("ntjhs_cfg", MODE_PRIVATE);
        while (running) {
            int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
            if (hour >= 21 || hour < 6) {
                sleepQuietly(300_000);
                continue;
            }
            try {
                String className = prefs.getString("class_name", "807");
                URL url = new URL(CLOUD_POLL_ENDPOINT + "?class=" + URLEncoder.encode(className, "UTF-8") + "&type=ifp");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Connection", "Keep-Alive");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(55000);

                int code = conn.getResponseCode();
                failCount = 0;
                if (code == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();
                    JSONObject msg = new JSONObject(sb.toString());
                    mainHandler.post(() -> showTopOverlay(msg));
                }
            } catch (Exception e) {
                int base = backoffSteps[Math.min(failCount++, backoffSteps.length - 1)];
                int jitter = new Random().nextInt(2500);
                sleepQuietly(base + jitter);
            }
        }
    }

    private void showTopOverlay(JSONObject msg) {
        removeOverlay();
        TextView banner = new TextView(this);
        banner.setText("📢 " + msg.optString("dept", "行政處室") + "：" + msg.optString("content", ""));
        banner.setTextColor(Color.WHITE);
        banner.setBackgroundColor(Color.parseColor("#E61E3A8A"));
        banner.setTextSize(24f);
        banner.setPadding(36, 22, 36, 22);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP;
        overlayView = banner;
        windowManager.addView(overlayView, params);

        int durationSec = msg.optInt("duration", 15);
        mainHandler.postDelayed(this::removeOverlay, durationSec * 1000L);
    }

    private void removeOverlay() {
        if (overlayView != null) {
            try { windowManager.removeView(overlayView); } catch (Exception ignored) {}
            overlayView = null;
        }
    }

    private void sleepQuietly(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }

    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() { running = false; removeOverlay(); super.onDestroy(); }
}