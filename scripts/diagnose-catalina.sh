#!/bin/bash

# Stream Mesh Catalina Diagnostic Script
# This script helps diagnose TTS and stability issues on macOS Catalina

echo "🔍 Stream Mesh Catalina Diagnostic Report"
echo "========================================"
echo ""

# System Information
echo "📱 System Information:"
echo "macOS Version: $(sw_vers -productVersion)"
echo "Architecture: $(uname -m)"
echo "Memory: $(sysctl -n hw.memsize | awk '{print $1/1024/1024/1024" GB"}')"
echo ""

# Node.js and Electron Information
if command -v node &> /dev/null; then
    echo "📦 Runtime Information:"
    echo "Node.js Version: $(node --version)"
    echo "npm Version: $(npm --version)"
else
    echo "❌ Node.js not found in PATH"
fi
echo ""

# Check for Stream Mesh process
echo "🔄 Stream Mesh Process Status:"
if pgrep -f "Stream Mesh" > /dev/null; then
    echo "✅ Stream Mesh is running"
    echo "Process ID: $(pgrep -f "Stream Mesh")"
    echo "Memory usage: $(ps -o pid,rss,command -p $(pgrep -f "Stream Mesh") | tail -n +2 | awk '{print $1, $2/1024" MB", $3}')"
else
    echo "❌ Stream Mesh is not running"
fi
echo ""

# Check for temp files
STREAM_MESH_DATA="$HOME/Library/Application Support/streammesh"
if [ -d "$STREAM_MESH_DATA" ]; then
    echo "📁 Stream Mesh Data Directory:"
    echo "Path: $STREAM_MESH_DATA"
    echo "Total size: $(du -sh "$STREAM_MESH_DATA" | cut -f1)"
    
    # Check for temp TTS files
    TTS_FILES=$(find "$STREAM_MESH_DATA" -name "streammesh_tts_*.mp3" -o -name "streammesh_tts_*.wav" 2>/dev/null | wc -l)
    if [ "$TTS_FILES" -gt 0 ]; then
        echo "⚠️  Found $TTS_FILES temporary TTS files"
        echo "Oldest temp file: $(find "$STREAM_MESH_DATA" -name "streammesh_tts_*" -type f -exec stat -f "%m %N" {} \; 2>/dev/null | sort -n | head -1 | cut -d' ' -f2-)"
    else
        echo "✅ No temporary TTS files found"
    fi
    
    # Check database size
    if [ -f "$STREAM_MESH_DATA/database.db" ]; then
        DB_SIZE=$(du -h "$STREAM_MESH_DATA/database.db" | cut -f1)
        echo "Database size: $DB_SIZE"
    fi
else
    echo "❌ Stream Mesh data directory not found"
fi
echo ""

# Check system resources
echo "💾 System Resources:"
echo "Available disk space: $(df -h / | tail -1 | awk '{print $4}')"
echo "Memory pressure: $(memory_pressure | head -1)"
echo ""

# Check for crash logs
echo "🚨 Recent Crash Logs:"
CRASH_LOGS=$(find ~/Library/Logs/DiagnosticReports -name "*Stream Mesh*" -mtime -7 2>/dev/null | wc -l)
if [ "$CRASH_LOGS" -gt 0 ]; then
    echo "⚠️  Found $CRASH_LOGS crash reports in the last 7 days"
    echo "Most recent: $(find ~/Library/Logs/DiagnosticReports -name "*Stream Mesh*" -mtime -7 2>/dev/null | head -1)"
else
    echo "✅ No recent crash reports found"
fi
echo ""

# Audio system check
echo "🔊 Audio System:"
if command -v afplay &> /dev/null; then
    echo "✅ afplay available for audio playback"
else
    echo "❌ afplay not found (required for TTS audio)"
fi
echo ""

# Network connectivity test
echo "🌐 Network Connectivity:"
if ping -c 1 -W 5000 polly.us-east-1.amazonaws.com &> /dev/null; then
    echo "✅ Can reach AWS Polly service"
else
    echo "❌ Cannot reach AWS Polly service"
fi
echo ""

# Recommendations
echo "💡 Recommendations:"

if [ "$TTS_FILES" -gt 5 ]; then
    echo "• Consider restarting Stream Mesh to clean up temporary files"
fi

if [ "$(sw_vers -productVersion | cut -d. -f1)" = "10" ] && [ "$(sw_vers -productVersion | cut -d. -f2)" = "15" ]; then
    echo "• Running on Catalina - ensure you're using the legacy build"
    echo "• Consider limiting TTS usage to prevent memory buildup"
    echo "• Restart the app every few hours during long streaming sessions"
fi

if [ "$CRASH_LOGS" -gt 0 ]; then
    echo "• Crash logs detected - check ~/Library/Logs/DiagnosticReports for details"
    echo "• Consider updating to a newer macOS version if possible"
fi

echo ""
echo "📧 Share this report with support if you need help troubleshooting"
echo "========================================"
