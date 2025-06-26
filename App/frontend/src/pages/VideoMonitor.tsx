import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, Camera, Settings, Play, Pause, Volume2, VolumeX, 
  Maximize2, RotateCcw, Download, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { VideoStream } from '../types';
import JSMpeg from 'jsmpeg';

// 全局聲明 JSMpeg
declare global {
  interface Window {
    JSMpeg: {
      Player: new (
        source: WebSocket | string,
        options?: {
          canvas?: HTMLCanvasElement;
          autoplay?: boolean;
          audio?: boolean;
          loop?: boolean;
          onPlay?: () => void;
          onPause?: () => void;
          onStalled?: () => void;
          onError?: () => void;
        }
      ) => {
        play: () => void;
        pause: () => void;
        stop: () => void;
        destroy: () => void;
        volume: number;
        levels: {
          current: number;
          peak: number;
        };
      };
    };
  }
}

type JSMpegPlayer = {
  play: () => void;
  pause: () => void;
  stop: () => void;
  destroy: () => void;
  volume: number;
  levels: {
    current: number;
    peak: number;
  };
};

export default function VideoMonitor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<JSMpegPlayer | null>(null);
  const [streams, setStreams] = useState<VideoStream[]>([]);
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [motionDetected, setMotionDetected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模擬載入攝影機串流
    try {
      // 等待 JSMpeg 加載
      const checkJSMpeg = setInterval(() => {
        if (window.JSMpeg) {
          clearInterval(checkJSMpeg);
          console.log('JSMpeg 已加載，開始初始化串流');
          
          setTimeout(() => {
            setStreams([
              {
                id: '1',
                device_id: '1',
                name: 'Tapo C200',
                url: 'rtsp://wang1567:15671567@192.168.137.75:554/stream1',
                status: 'active',
                resolution: '1080p',
                created_at: new Date().toISOString()
              }
            ]);
            setActiveStream('1');
            setLoading(false);
          }, 1500);
        }
      }, 100);

      // 5 秒後如果還沒加載就停止檢查
      setTimeout(() => {
        clearInterval(checkJSMpeg);
        if (!window.JSMpeg) {
          setError('JSMpeg 加載超時，請刷新頁面重試');
          setLoading(false);
        }
      }, 5000);

    } catch (err) {
      setError(`載入攝影機串流時發生錯誤: ${err instanceof Error ? err.message : '未知錯誤'}`);
      setLoading(false);
    }

    // 模擬動態偵測
    const motionInterval = setInterval(() => {
      const shouldDetect = Math.random() > 0.7;
      setMotionDetected(shouldDetect);
    }, 5000);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      clearInterval(motionInterval);
    };
  }, []);

  useEffect(() => {
    if (activeStream && canvasRef.current) {
      const stream = streams.find(s => s.id === activeStream);
      if (stream) {
        initializeStream(stream.url);
      }
    }
  }, [activeStream, streams]);

  const initializeStream = (rtspUrl: string) => {
    // 關閉現有的連接
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // 從 URL 中提取攝影機 ID
    const cameraId = rtspUrl.includes('camera1') ? 'camera1' : 'camera2';
    const wsPort = cameraId === 'camera1' ? 8081 : 8082;

    // 建立 WebSocket 連接
    const wsUrl = `ws://localhost:${wsPort}`;
    console.log('正在連接到 WebSocket:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket 連接已建立');
        setError(null);
      };

      ws.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
        setError('串流連接失敗');
      };

      ws.onclose = () => {
        console.log('WebSocket 連接已關閉');
      };

      // 初始化 JSMpeg 播放器
      if (canvasRef.current) {
        console.log('正在初始化 JSMpeg 播放器');
        const player = new JSMpeg.Player(ws, {
          canvas: canvasRef.current,
          autoplay: true,
          audio: !muted,
          loop: false,
          onPlay: () => {
            console.log('播放器開始播放');
            setIsPlaying(true);
          },
          onPause: () => {
            console.log('播放器已暫停');
            setIsPlaying(false);
          },
          onStalled: () => {
            console.error('串流停滯');
            setError('串流停滯');
          },
          onError: () => {
            console.error('播放錯誤');
            setError('播放錯誤');
          },
        });

        wsRef.current = ws;
        playerRef.current = player;
      }
    } catch (error) {
      console.error('初始化串流時發生錯誤:', error);
      setError('初始化串流失敗');
    }
  };

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.volume = muted ? 1 : 0;
      setMuted(!muted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleRecording = () => {
    setRecording(!recording);
    // 這裡可以實作實際的錄影邏輯
  };

  const handleQualityChange = (newQuality: '1080p' | '720p' | '480p') => {
    setQuality(newQuality);
    if (playerRef.current) {
      // JSMpeg 不支援直接切換品質，這裡只是更新狀態
      console.log(`已切換到 ${newQuality} 品質`);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    const timer = setTimeout(() => {
      if (!showSettings) {
        setShowControls(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>返回主頁</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-gray-300 hover:text-white"
                title={showSidebar ? "隱藏側邊欄" : "顯示側邊欄"}
              >
                {showSidebar ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主視窗 */}
          <div className={`${showSidebar ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            <div 
              className="bg-black rounded-lg overflow-hidden relative aspect-video"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(false)}
            >
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="flex flex-col items-center gap-4">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                    <p>{error}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重試
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover"
                  />

                  {/* 動態偵測提示 */}
                  {motionDetected && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                      偵測到動態
                    </div>
                  )}

                  {/* 錄影提示 */}
                  {recording && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      錄影中
                    </div>
                  )}

                  {/* 控制列 */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${
                      showControls ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={togglePlay}
                          className="text-white hover:text-blue-400 transition-colors"
                          title={isPlaying ? "暫停" : "播放"}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6" />
                          ) : (
                            <Play className="w-6 h-6" />
                          )}
                        </button>
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-blue-400 transition-colors"
                          title={muted ? "取消靜音" : "靜音"}
                        >
                          {muted ? (
                            <VolumeX className="w-6 h-6" />
                          ) : (
                            <Volume2 className="w-6 h-6" />
                          )}
                        </button>
                        <button
                          onClick={toggleRecording}
                          className={`text-white hover:text-blue-400 transition-colors ${
                            recording ? 'text-red-500' : ''
                          }`}
                          title={recording ? "停止錄影" : "開始錄影"}
                        >
                          <span className="relative">
                            <Download className="w-6 h-6" />
                            {recording && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                            )}
                          </span>
                        </button>
                        <button
                          onClick={() => setShowSettings(!showSettings)}
                          className="text-white hover:text-blue-400 transition-colors"
                          title={showSettings ? "關閉設定" : "開啟設定"}
                        >
                          <Settings className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={quality}
                            onChange={(e) => handleQualityChange(e.target.value as '1080p' | '720p' | '480p')}
                            className="bg-transparent text-white text-sm border border-white/30 rounded px-2 py-1"
                            aria-label="選擇影片品質"
                            title="選擇影片品質"
                          >
                            <option value="1080p">1080p</option>
                            <option value="720p">720p</option>
                            <option value="480p">480p</option>
                          </select>
                        </div>
                        <button
                          onClick={toggleFullscreen}
                          className="text-white hover:text-blue-400 transition-colors"
                          title={isFullscreen ? "退出全螢幕" : "全螢幕"}
                        >
                          <Maximize2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 設定面板 */}
                  {showSettings && (
                    <div className="absolute right-4 bottom-20 bg-gray-900/95 rounded-lg p-4 w-64">
                      <h3 className="text-white font-medium mb-4">影像設定</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-white/80 text-sm block mb-2">亮度</label>
                          <input 
                            type="range" 
                            className="w-full" 
                            title="調整亮度"
                            aria-label="調整亮度"
                          />
                        </div>
                        <div>
                          <label className="text-white/80 text-sm block mb-2">對比度</label>
                          <input 
                            type="range" 
                            className="w-full" 
                            title="調整對比度"
                            aria-label="調整對比度"
                          />
                        </div>
                        <div>
                          <label className="text-white/80 text-sm block mb-2">飽和度</label>
                          <input 
                            type="range" 
                            className="w-full" 
                            title="調整飽和度"
                            aria-label="調整飽和度"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 側邊欄 */}
          {showSidebar && (
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-white text-lg font-semibold mb-4">可用攝影機</h2>
                <div className="space-y-3">
                  {streams.map((stream) => (
                    <button
                      key={stream.id}
                      onClick={() => setActiveStream(stream.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        activeStream === stream.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Camera className="w-5 h-5" />
                        <div>
                          <p className="font-medium">{stream.name}</p>
                          <p className="text-sm opacity-75">
                            {stream.status === 'active' ? (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                串流中
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                離線
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* 快速功能 */}
                <div className="mt-6">
                  <h3 className="text-white/80 text-sm font-medium mb-3">快速功能</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-2 bg-gray-700 rounded-lg text-white/80 hover:bg-gray-600 transition-colors text-sm">
                      截圖
                    </button>
                    <button className="p-2 bg-gray-700 rounded-lg text-white/80 hover:bg-gray-600 transition-colors text-sm">
                      分享
                    </button>
                    <button className="p-2 bg-gray-700 rounded-lg text-white/80 hover:bg-gray-600 transition-colors text-sm">
                      全螢幕
                    </button>
                    <button className="p-2 bg-gray-700 rounded-lg text-white/80 hover:bg-gray-600 transition-colors text-sm">
                      設定
                    </button>
                  </div>
                </div>

                {/* 系統狀態 */}
                <div className="mt-6">
                  <h3 className="text-white/80 text-sm font-medium mb-3">系統狀態</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">CPU 使用率</span>
                      <span className="text-white">32%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">記憶體使用率</span>
                      <span className="text-white">45%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">網路延遲</span>
                      <span className="text-white">23ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}