import { useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

interface VideoPlayerProps {
    onVideoLoaded: (filePath: string, fileName: string) => void;
    activeClipType: 'Offense' | 'Defense' | null;
    previewRange: { start: number; end: number } | null;
    onPreviewEnd: () => void;
    streamPort: number | null;
}

export interface VideoPlayerHandle {
    getCurrentTime: () => number;
    seekTo: (time: number) => void;
    isPlaying: () => boolean;
    playSegment: (start: number, end: number) => void;
    pause: () => void;
    play: () => void;
    setPlaybackRate: (rate: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
    ({ onVideoLoaded, activeClipType, previewRange, onPreviewEnd, streamPort }, ref) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const [videoSrc, setVideoSrc] = useState<string | null>(null);
        const [fileName, setFileName] = useState<string>('');
        const [playing, setPlaying] = useState(false);
        const [loading, setLoading] = useState(false);
        const [playbackRate, setPlaybackRateState] = useState<number>(1);
        const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

        useImperativeHandle(ref, () => ({
            getCurrentTime: () => videoRef.current?.currentTime ?? 0,
            seekTo: (time: number) => {
                if (videoRef.current) {
                    videoRef.current.currentTime = time;
                }
            },
            isPlaying: () => playing,
            playSegment: (start: number, end: number) => {
                if (!videoRef.current) return;
                videoRef.current.currentTime = start;
                videoRef.current.play();

                if (previewTimerRef.current) {
                    clearInterval(previewTimerRef.current);
                }

                previewTimerRef.current = setInterval(() => {
                    if (videoRef.current && videoRef.current.currentTime >= end) {
                        videoRef.current.pause();
                        if (previewTimerRef.current) {
                            clearInterval(previewTimerRef.current);
                            previewTimerRef.current = null;
                        }
                        onPreviewEnd();
                    }
                }, 100);
            },
            pause: () => {
                if (videoRef.current) {
                    videoRef.current.pause();
                }
            },
            play: () => {
                if (videoRef.current) {
                    videoRef.current.play();
                }
            },
            setPlaybackRate: (rate: number) => {
                if (videoRef.current) {
                    videoRef.current.playbackRate = rate;
                    setPlaybackRateState(rate);
                }
            },
        }));

        const handleRateChange = useCallback((rate: number) => {
            if (videoRef.current) {
                videoRef.current.playbackRate = rate;
                setPlaybackRateState(rate);
            }
        }, []);

        const processFile = useCallback(async (filePath: string) => {
            const parts = filePath.split(/[/\\]/);
            const name = parts[parts.length - 1];

            setLoading(true);
            try {
                let streamUrl: string;
                // Strip 'file://' prefix which drag-drop events sometimes include
                const cleanPath = filePath.replace(/^file:\/\//i, '');
                
                // Tauri's asset protocol handles Range requests & audio natively on Windows WebView2.
                // On macOS WebKit, the asset protocol often breaks audio tracks, so we use the local stream server.
                if (navigator.userAgent.includes('Win')) {
                    const { convertFileSrc } = await import('@tauri-apps/api/core');
                    streamUrl = convertFileSrc(cleanPath);
                } else {
                    if (!streamPort) {
                        console.error('Stream port is not available yet');
                        return;
                    }
                    // For macOS/Linux, ensure valid URL encoding while preserving the absolute path root
                    const encodedSegments = cleanPath.split('/').map(encodeURIComponent);
                    const encodedPath = encodedSegments.join('/');
                    streamUrl = `http://127.0.0.1:${streamPort}${encodedPath.startsWith('/') ? '' : '/'}${encodedPath}`;
                }

                setVideoSrc(streamUrl);
                setFileName(name);
                onVideoLoaded(filePath, name);
            } catch (err) {
                console.error('Failed to construct video stream URL:', err);
            } finally {
                setLoading(false);
            }
        }, [onVideoLoaded, streamPort]);

        const handleOpenFile = useCallback(async () => {
            const selected = await open({
                multiple: false,
                filters: [
                    {
                        name: 'Video',
                        extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
                    },
                ],
            });

            if (selected && typeof selected === 'string') {
                await processFile(selected);
            }
        }, [processFile]);

        // Drag and drop support
        useEffect(() => {
            let unlisten: () => void;

            const setupDragDrop = async () => {
                const { listen } = await import('@tauri-apps/api/event');
                unlisten = await listen<any>('tauri://drag-drop', (e) => {
                    const payload = e.payload as { paths: string[] };
                    const paths = payload.paths;
                    if (paths && paths.length > 0) {
                        let file = paths[0];
                        file = file.replace(/^file:\/\//i, '');
                        // On Windows, the path might be like /C:/Users/...
                        if (navigator.userAgent.includes('Win') && file.startsWith('/')) {
                            file = file.slice(1);
                        }
                        const ext = file.split('.').pop()?.toLowerCase() || '';
                        if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
                            processFile(file);
                        }
                    }
                });
            };

            setupDragDrop();
            return () => {
                if (unlisten) unlisten();
            };
        }, [processFile]);

        return (
            <div className="video-player">
                {!videoSrc ? (
                    <div className="video-placeholder" onClick={handleOpenFile}>
                        <div className="placeholder-content">
                            {loading ? (
                                <>
                                    <div className="loading-spinner" />
                                    <h3>Loading video…</h3>
                                </>
                            ) : (
                                <>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <h3>Import Game Video</h3>
                                    <p>Click here or drag a video file</p>
                                    <p className="formats">MP4 · MOV · AVI · MKV · WebM</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            controls
                            className="video-element"
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                        />
                        <div className="video-toolbar">
                            <span className="video-name">{fileName}</span>

                            <div className="playback-controls">
                                <button
                                    className={`btn-rate ${playbackRate === 0.5 ? 'active' : ''}`}
                                    onClick={() => handleRateChange(0.5)}
                                >0.5x</button>
                                <button
                                    className={`btn-rate ${playbackRate === 1 ? 'active' : ''}`}
                                    onClick={() => handleRateChange(1)}
                                >1x</button>
                                <button
                                    className={`btn-rate ${playbackRate === 2 ? 'active' : ''}`}
                                    onClick={() => handleRateChange(2)}
                                >2x</button>
                            </div>

                            <button className="btn-secondary btn-sm" onClick={handleOpenFile}>
                                Change Video
                            </button>
                        </div>
                    </>
                )}

                {activeClipType && (
                    <div className={`recording-badge ${activeClipType.toLowerCase()}`}>
                        <span className="rec-dot" />
                        REC: {activeClipType}
                    </div>
                )}

                {previewRange && (
                    <div className="preview-badge">
                        <span className="preview-icon">▶</span>
                        Preview: {previewRange.start.toFixed(1)}s — {previewRange.end.toFixed(1)}s
                    </div>
                )}
            </div>
        );
    }
);

VideoPlayer.displayName = 'VideoPlayer';
