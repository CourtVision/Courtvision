import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

interface ExportButtonProps {
    videoId: number | null;
    clipCount: number;
    disabled: boolean;
}

export function ExportButton({ videoId, clipCount, disabled }: ExportButtonProps) {
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleExport = async () => {
        if (!videoId || clipCount === 0) return;

        try {
            // Ask user to select output directory
            const outputDir = await save({
                title: 'Select Export Folder',
                defaultPath: 'courtvision-clips',
            });

            if (!outputDir) return;

            // Use the parent directory of the selected path
            const dirPath = outputDir.substring(0, outputDir.lastIndexOf('/'));

            setExporting(true);
            setError('');
            setProgress('Exporting clips...');

            const result = await invoke<string[]>('export_all_clips', {
                videoId,
                outputDir: dirPath || outputDir,
            });

            setProgress(`✓ Exported ${result.length} clip(s) successfully!`);
            setTimeout(() => {
                setProgress('');
                setExporting(false);
            }, 3000);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            setExporting(false);
            setProgress('');
        }
    };

    return (
        <div className="export-section">
            <button
                className="btn-export"
                onClick={handleExport}
                disabled={disabled || exporting || !videoId || clipCount === 0}
            >
                {exporting ? (
                    <>
                        <span className="spinner" />
                        Exporting...
                    </>
                ) : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        Export Clips (MP4)
                    </>
                )}
            </button>

            {progress && <p className="export-progress">{progress}</p>}
            {error && <p className="export-error">{error}</p>}

            {clipCount === 0 && videoId && (
                <p className="export-hint">Create clips first using hotkeys</p>
            )}
        </div>
    );
}
