#!/bin/bash

# Magento Import Monitor
# Check de voortgang van de import

LOG_FILE="/tmp/import-test.log"

echo "=========================================="
echo "  MAGENTO IMPORT - LIVE MONITOR"
echo "=========================================="
echo ""

# Check if import is running
IMPORT_PID=$(ps aux | grep "import-magento-full" | grep -v grep | awk '{print $2}' | head -1)

if [ ! -z "$IMPORT_PID" ]; then
    echo "✓ Import is RUNNING (PID: $IMPORT_PID)"
else
    echo "⚠ Import is NOT running"
fi

echo ""
echo "Latest output (laatste 40 regels):"
echo "----------------------------------------"
tail -40 "$LOG_FILE" 2>/dev/null || echo "Log file not found"

echo ""
echo "=========================================="
echo "Refresh met: bash scripts/monitor-import.sh"
echo "Stop import met: kill $IMPORT_PID"
echo "=========================================="
