import asyncio
from bleak import BleakScanner
from datetime import datetime

# Store first-seen timestamps by device address
seen_devices = {}

def detection_callback(device, advertisement_data):
    if device.address not in seen_devices:
        timestamp = datetime.now().isoformat(timespec="seconds")
        seen_devices[device.address] = timestamp

        print(
            f"[{timestamp}] "
            f"NEW DEVICE: {device.address} | "
            f"Name={device.name} | "
            f"RSSI={advertisement_data.rssi}"
        )

async def main():
    scanner = BleakScanner(detection_callback)

    print("Starting continuous BLE scan (Ctrl+C to stop)...")
    await scanner.start()

    try:
        while True:
            await asyncio.sleep(1)  # keep event loop alive
    except KeyboardInterrupt:
        print("\nStopping scan...")
    finally:
        await scanner.stop()

        print("\nSummary (first seen timestamps):")
        for addr, ts in seen_devices.items():
            print(f"{addr} first seen at {ts}")

asyncio.run(main())
