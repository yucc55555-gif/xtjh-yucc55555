package tw.edu.ntpc.ntjhs.broadcast;

import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;

/**
 * 新泰國中校園無聲廣播系統 - Android IFP 觸控大屏設定畫面
 * 採線上網頁版雲端架構：安裝 APK 後「只要輸入班級」即可執行，不須輸入伺服器 IP！
 */
public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 48, 48, 48);

        TextView header = new TextView(this);
        header.setText("🏫 新泰國中校園無聲廣播系統 - 觸控大屏接收端");
        header.setTextSize(22f);
        root.addView(header);

        TextView subHint = new TextView(this);
        subHint.setText("線上網頁版雲端直連（免輸入伺服器 IP，請直接輸入本教室班級名稱）：");
        subHint.setTextSize(15f);
        subHint.setPadding(0, 20, 0, 12);
        root.addView(subHint);

        SharedPreferences prefs = getSharedPreferences("ntjhs_cfg", MODE_PRIVATE);

        // 唯一設定欄位：只需輸入班級名稱即可執行
        EditText etClassName = new EditText(this);
        etClassName.setHint("請輸入班級名稱 (例如：701、807、917 或 校史室)");
        etClassName.setText(prefs.getString("class_name", "807"));
        etClassName.setTextSize(20f);
        root.addView(etClassName);

        Button btnSave = new Button(this);
        btnSave.setText("儲存班級並啟動無聲廣播服務");
        btnSave.setOnClickListener(v -> {
            String className = etClassName.getText().toString().trim();
            if (className.isEmpty()) {
                Toast.makeText(this, "請先輸入班級名稱（例如 807）！", Toast.LENGTH_SHORT).show();
                return;
            }
            prefs.edit().putString("class_name", className).apply();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                Toast.makeText(this, "請開啟「顯示在其他應用程式上層」權限後再按一次啟動", Toast.LENGTH_LONG).show();
                return;
            }
            Intent svc = new Intent(this, BroadcastOverlayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc);
            else startService(svc);
            Toast.makeText(this, "已綁定「" + className + "」並啟動大屏無聲廣播服務！", Toast.LENGTH_SHORT).show();
        });
        root.addView(btnSave);
        setContentView(root);
    }
}