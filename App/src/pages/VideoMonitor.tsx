import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, Camera, Settings, Play, Pause, Volume2, VolumeX, 
  Maximize2, RotateCcw, Download, Share2, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { VideoStream } from '../types';

export default function VideoMonitor() {
  const [streams, setStreams] = useState<VideoStream[]>([]);
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [motionDetected, setMotionDetected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 模擬載入攝影機串流
    setTimeout(() => {
      setStreams([
        {
          id: '1',
          device_id: '1',
          name: '客廳攝影機',
          url: 'https://example.com/stream1',
          status: 'active',
          resolution: '1080p',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          device_id: '2',
          name: '寵物房攝影機',
          url: 'https://example.com/stream2',
          status: 'active',
          resolution: '1080p',
          created_at: new Date().toISOString()
        }
      ]);
      setActiveStream('1');
      setLoading(false);
    }, 1500);

    // 模擬動態偵測
    const motionInterval = setInterval(() => {
      const shouldDetect = Math.random() > 0.7;
      setMotionDetected(shouldDetect);
    }, 5000);

    return () => clearInterval(motionInterval);
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setMuted(!muted);
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
    // 這裡可以實作切換畫質的邏輯
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
                  <video
                    className="w-full h-full object-cover"
                    poster="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80"
                    autoPlay
                    playsInline
                    muted={muted}
                  >
                    <source src="https://example.com/stream" type="video/mp4" />
                  </video>

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
                          >
                            <option value="1080p">1080p</option>
                            <option value="720p">720p</option>
                            <option value="480p">480p</option>
                          </select>
                        </div>
                        <button
                          onClick={toggleFullscreen}
                          className="text-white hover:text-blue-400 transition-colors"
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
                          <input type="range" className="w-full" />
                        </div>
                        <div>
                          <label className="text-white/80 text-sm block mb-2">對比度</label>
                          <input type="range" className="w-full" />
                        </div>
                        <div>
                          <label className="text-white/80 text-sm block mb-2">飽和度</label>
                          <input type="range" className="w-full" />
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