const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const app = express();

// 啟用 CORS
app.use(cors());

// 創建 WebSocket 服務器
const wss = new WebSocket.Server({ port: 8081 });

// RTSP URL
const rtspUrl = 'rtsp://wang1567:15671567@192.168.137.75:554/stream1';

// FFmpeg 命令
const ffmpeg = spawn('ffmpeg', [
    '-i', rtspUrl,
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-s', '1280x720',
    '-b:v', '1000k',
    '-bf', '0',
    '-muxdelay', '0.001',
    'pipe:1'
]);

ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg:', data.toString());
});

ffmpeg.on('close', (code) => {
    console.log('FFmpeg 進程已關閉，代碼:', code);
});

// WebSocket 連接處理
wss.on('connection', (ws) => {
    console.log('新的 WebSocket 連接');

    // 發送 FFmpeg 輸出到 WebSocket
    ffmpeg.stdout.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket 連接已關閉');
    });
});

// API 路由
app.get('/streams', (req, res) => {
    res.json(['camera1']);
});

app.get('/stream/:id/status', (req, res) => {
    res.json({ status: 'active' });
});

// 錯誤處理
process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('未處理的 Promise 拒絕:', error);
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`串流伺服器運行在端口 ${PORT}`);
}); 