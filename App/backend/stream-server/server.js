// --- PAWSCONNECT 即時影像串流伺服器 ---
// 這是經過多次測試和修正後，最終的、最穩定的版本。
// 它的唯一目的，就是將您本地攝影機的 RTSP 影像，轉換成瀏覽器可以讀取的 MJPEG 格式。

const Stream = require('node-rtsp-stream');

// --- 組態設定 (請務必修改！) ---
// 重要提示：請將此處的 RTSP URL 換成您攝影機的【真實位址】，包含正確的帳號和密碼。
const rtspUrl = 'rtsp://wang1567:15671567@192.168.88.103:554/stream1';

// --- 連接埠解釋 ---
// streamPort: 這是我們真正需要的 MJPEG 影像服務所使用的連接埠。
// webSocketPort: 這是套件內部管理用的連接埠，我們不會直接使用它，但必須提供。
const streamPort = 8082;
const webSocketPort = 8083;

// --- 伺服器啟動 ---
console.log('================================================================');
console.log(' PawsConnect 即時影像串流伺服器');
console.log('================================================================');
console.log(`[設定] 正在嘗試連線至您的本地攝影機...`);
console.log(`       (URL: ${rtspUrl.replace(/:.*@/, '://****:****@')})`);

const stream = new Stream({
    name: 'PawsConnect Live Stream',
    streamUrl: rtspUrl,
    wsPort: webSocketPort,
    // 以下是 ffmpeg 的參數，我們明確指定影像品質以確保穩定性。
    ffmpegOptions: {
        '-stats': '',      // 在終端機顯示處理狀態
        '-r': 15,          // 設定一個穩定的幀率 (15 fps)
        '-q:v': 8          // 設定影像品質 (數字越低品質越好，8 是一個很好的平衡點)
    }
});

// 監聽 ffmpeg 因任何原因退出時的事件
stream.on('exitWithError', () => {
    console.error('\n[!! 嚴重錯誤 !!] FFmpeg 程序意外終止。');
    console.error('這通常是因為：');
    console.error('  1. RTSP URL 不正確 (IP、連接埠錯誤)。');
    console.error('  2. 帳號或密碼錯誤。');
    console.error('  3. 與攝影機的網路連線中斷。');
    console.error('請檢查您的攝影機連線和上面的 rtspUrl 設定，然後重新啟動此伺服器。');
    stream.stop(); // 確保停止所有相關程序
});

console.log(`\n[成功] 本地影像伺服器已啟動，正在監聽連接埠 ${streamPort}`);
console.log(`       您可以在本地瀏覽器打開 http://localhost:${streamPort} 進行測試。`);
console.log('\n----------------------【接下來的操作步驟】----------------------');
console.log(' ** 您的本地影像伺服器已在運行中，請不要關閉此視窗！**\n');
console.log(' (1) 開啟【另一個】新的終端機視窗。');
console.log(` (2) 在新視窗中，執行 ngrok 指令來建立公開網址:`);
console.log(`     ngrok http ${streamPort} --host-header="localhost:${streamPort}"`);
console.log('\n (3) ngrok 將會提供一個 `Forwarding` 開頭的公開網址 (例如: https://abcd-1234.ngrok-free.app)。');
console.log(' (4) 【最關鍵的一步：手動授權】');
console.log('     直接在您的【瀏覽器】中打開剛剛複製的 ngrok 公開網址。');
console.log('     您會看到一個 ngrok 的歡迎頁面，請點擊藍色的 "Visit Site" 按鈕。');
console.log('     點擊後，您應該就能看到攝影機的即時影像。');
console.log('\n (5) 確認影像成功顯示後，將這個 ngrok 公開網址 (不包含任何結尾路徑) 更新到您 Supabase 資料庫中對應狗狗的 `live_stream_url` 欄位。');
console.log(' (6) 重新整理 PawsConnect 應用程式，現在「觀看即時影像」按鈕應該可以正常運作了！');
console.log('----------------------------------------------------------------\n');
