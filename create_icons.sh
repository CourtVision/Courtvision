#!/bin/bash
MAXDIM=$(sips -g pixelWidth -g pixelHeight public/courtvisionlogo.png | grep -oE '[0-9]+' | sort -nr | head -1)
echo "Max dimension: $MAXDIM"
# Create a blank square image (transparent by default or white?)
# sips --padToHeightWidth pads with a color (hex). We'll pad with transparent FFFFFF00 
sips --padToHeightWidth $MAXDIM $MAXDIM --padColor FFFFFF00 public/courtvisionlogo.png --out public/courtvisionlogo_square.png
npx tauri icon public/courtvisionlogo_square.png
