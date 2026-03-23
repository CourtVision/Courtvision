import urllib.request
import os
import stat

os.makedirs("src-tauri/binaries", exist_ok=True)

binaries = {
    "ffmpeg-aarch64-apple-darwin": "https://github.com/eugeneware/ffmpeg-static/releases/download/b5.1/ffmpeg-darwin-arm64",
    "ffmpeg-x86_64-apple-darwin": "https://github.com/eugeneware/ffmpeg-static/releases/download/b5.1/ffmpeg-darwin-x64",
    "ffmpeg-x86_64-pc-windows-msvc.exe": "https://github.com/eugeneware/ffmpeg-static/releases/download/b5.1/ffmpeg-win32-x64.exe"
}

for name, url in binaries.items():
    path = os.path.join("src-tauri/binaries", name)
    print(f"Downloading {name} from {url}...")
    
    # Add a user-agent header to avoid 403 blocks from Github releases
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
    except Exception as e:
        print(f"Failed to download {name}: {e}")
        continue

    # Make executable if it's on Mac
    if not name.endswith(".exe"):
        st = os.stat(path)
        os.chmod(path, st.st_mode | stat.S_IEXEC)
        
print("All binaries downloaded successfully.")
