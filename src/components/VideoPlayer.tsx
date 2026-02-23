import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

interface VideoPlayerProps {
    onVideoLoaded: (filePath: string, fileName: string) => void;
    activeClipType: 'Offense' | 'Defense' | null;
}

export interface VideoPlayerHandle {
    getCurrentTime: () => number;
    seekTo: (time: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
    ({ onVideoLoaded, activeClipType }, ref) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const [videoSrc, setVideoSrc] = useState<string | null>(null);
        const [fileName, setFileName] = useState<string>('');

        useImperativeHandle(ref, () => ({
            getCurrentTime: () => videoRef.current?.currentTime ?? 0,
            seekTo: (time: number) => {
                if (videoRef.current) {
                    videoRef.current.currentTime = time;
                }
            },
        }));

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
                const parts = selected.split('/');
                const name = parts[parts.length - 1];
                const assetUrl = convertFileSrc(selected);
                setVideoSrc(assetUrl);
                setFileName(name);
                onVideoLoaded(selected, name);
            }
        }, [onVideoLoaded]);

        return (
            <div className="video-player">
                {!videoSrc ? (
                    <div className="video-placeholder" onClick={handleOpenFile}>
                        <div className="placeholder-content">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <h3>Import Game Video</h3>
                            <p>Click here or drag a video file</p>
                            <p className="formats">MP4 · MOV · AVI · MKV · WebM</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            controls
                            className="video-element"
                        />
                        <div className="video-toolbar">
                            <span className="video-name">{fileName}</span>
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
            </div>
        );
    }
);

VideoPlayer.displayName = 'VideoPlayer';
