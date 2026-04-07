import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function optimizeVideo(file: File, onProgress?: (p: number) => void): Promise<File> {
  const instance = await loadFFmpeg();
  
  // 1. Write the file to the virtual filesystem
  const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.mp4');
  const outputName = 'output.mp4';
  
  await instance.writeFile(inputName, await fetchFile(file));

  if (onProgress) {
    instance.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  // 2. Transcode with an "Ultra-Fast Crunch" preset (720p Optimized)
  // -vcodec libx264: High-efficiency compression
  // -crf 32: Lower bitrate, significantly faster upload
  // -vf "scale=-2:720": Downscales to 720p for massive size reduction
  await instance.exec([
    '-i', inputName,
    '-vcodec', 'libx264',
    '-crf', '32',
    '-preset', 'ultrafast',
    '-vf', "scale=-2:720",
    '-acodec', 'aac',
    '-b:a', '64k', // Lower audio bitrate to save space
    '-movflags', '+faststart', // Helps web playback
    outputName
  ]);

  // 3. Read back the optimized file
  const data = await instance.readFile(outputName) as Uint8Array;
  
  // 4. Cleanup
  await instance.deleteFile(inputName);
  await instance.deleteFile(outputName);

  return new File([data.buffer as ArrayBuffer], file.name.replace(/\.[^/.]+$/, "") + "_optimized.mp4", { type: 'video/mp4' });
}
