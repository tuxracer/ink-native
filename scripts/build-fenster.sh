#!/usr/bin/env bash
# Build the fenster native bridge library
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NATIVE_DIR="$PROJECT_DIR/native"

cd "$NATIVE_DIR"

case "$(uname -s)" in
  Darwin)
    echo "Building fenster bridge for macOS..."
    cc -shared -O2 \
      -framework Cocoa \
      -o fenster.dylib \
      fenster_bridge.c
    echo "Built native/fenster.dylib"
    ;;
  Linux)
    echo "Building fenster bridge for Linux..."
    cc -shared -fPIC -O2 \
      -lX11 \
      -o fenster.so \
      fenster_bridge.c
    echo "Built native/fenster.so"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "Building fenster bridge for Windows..."
    cc -shared -O2 \
      -lgdi32 -luser32 \
      -o fenster.dll \
      fenster_bridge.c
    echo "Built native/fenster.dll"
    ;;
  *)
    echo "Unsupported platform: $(uname -s)" >&2
    exit 1
    ;;
esac
