# dice_proxy_full.py
import asyncio
import socketio
from bleak import BleakClient, BleakScanner
from typing import Dict, Set

SERVER_URL = "http://localhost:3001"
DEVICE_PREFIX = "GoDice_"

CONTROL_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  # write commands
NOTIFY_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"   # notifications

# Socket.IO client
sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("Connected to Node server.")

@sio.event
async def disconnect():
    print("Disconnected from Node server.")

# ----- Dice vectors and transforms -----
D6_VECTORS = {
    1: [-64, 0, 0],
    2: [0, 0, 64],
    3: [0, 64, 0],
    4: [0, -64, 0],
    5: [0, 0, -64],
    6: [64, 0, 0],
}

D20_VECTORS = {
    1: [-64, 0, -22], 2: [42, -42, 40], 3: [0, 22, -64], 4: [0, 22, 64], 5: [-42, -42, 42],
    6: [22, 64, 0], 7: [-42, -42, -42], 8: [64, 0, -22], 9: [-22, 64, 0], 10: [42, -42, -42],
    11: [-42, 42, 42], 12: [22, -64, 0], 13: [-64, 0, 22], 14: [42, 42, 42], 15: [-22, -64, 0],
    16: [42, 42, -42], 17: [0, -22, -64], 18: [0, -22, 64], 19: [-42, 42, -42], 20: [64, 0, 22],
}

D24_VECTORS = {i: [0,0,0] for i in range(1,25)}  # placeholder, fill if needed

# ----- Helper functions -----
def closest_vector(vector_table, coord):
    x, y, z = coord
    min_dist = float('inf')
    value = 0
    for die_value, vec in vector_table.items():
        dx, dy, dz = x - vec[0], y - vec[1], z - vec[2]
        dist = dx*dx + dy*dy + dz*dz
        if dist < min_dist:
            min_dist = dist
            value = die_value
    return value

def parse_xyz(data: bytearray, start: int):
    x = data[start]
    y = data[start + 1]
    z = data[start + 2]

    # Convert unsigned byte → signed int8
    x = x - 256 if x > 127 else x
    y = y - 256 if y > 127 else y
    z = z - 256 if z > 127 else z

    return [x, y, z]

def parse_dice_value(data: bytearray, start: int, die_type='D6'):
    xyz = parse_xyz(data, start)
    if die_type == 'D6':
        return closest_vector(D6_VECTORS, xyz)
    elif die_type == 'D20':
        return closest_vector(D20_VECTORS, xyz)
    else:
        return closest_vector(D24_VECTORS, xyz)

# ----- BLE handling -----
async def handle_notification(sender, data: bytearray, dice_name: str):
    """Parse GoDice messages and emit events to Node server."""
    payload_raw = list(data)
    await sio.emit("dice_data", {"dice": dice_name, "characteristic": str(sender.uuid), "raw_data": payload_raw})

    if len(data) < 3:
        return

    first, second, third = data[0], data[1], data[2]

    # Roll start
    if first == 82:
        await sio.emit("roll_start", {"dice": dice_name})
    # Battery
    elif first == 66 and second == 97 and third == 116:  # "Bat"
        battery = data[3]
        await sio.emit("battery_level", {"dice": dice_name, "level": battery})
    # Dice color
    elif first == 67 and second == 111 and third == 108:  # "Col"
        color = data[3]
        await sio.emit("dice_color", {"dice": dice_name, "color": color})
    # Stable
    elif first == 83:  # "S"
        value = parse_dice_value(data, 1)
        xyz = parse_xyz(data, 1)
        await sio.emit("stable", {"dice": dice_name, "value": value, "xyz": xyz})
    # Fake stable
    elif first == 70 and second == 83:  # "FS"
        value = parse_dice_value(data, 2)
        xyz = parse_xyz(data, 2)
        await sio.emit("fake_stable", {"dice": dice_name, "value": value, "xyz": xyz})
    # Tilt stable
    elif first == 84 and second == 83:  # "TS"
        value = parse_dice_value(data, 2)
        xyz = parse_xyz(data, 2)
        await sio.emit("tilt_stable", {"dice": dice_name, "value": value, "xyz": xyz})
    # Move stable
    elif first == 77 and second == 83:  # "MS"
        value = parse_dice_value(data, 2)
        xyz = parse_xyz(data, 2)
        await sio.emit("move_stable", {"dice": dice_name, "value": value, "xyz": xyz})

async def connect_dice(device_name: str):
    while True:
        try:
            device = await BleakScanner.find_device_by_filter(lambda d, ad: d.name == device_name)
            if not device:
                await asyncio.sleep(3)
                continue

            async with BleakClient(device) as client:
                print(f"{device_name} connected")

                control_char = None
                notify_char = None
                for service in client.services:
                    for char in service.characteristics:
                        if char.uuid == CONTROL_UUID:
                            control_char = char
                        elif char.uuid == NOTIFY_UUID:
                            notify_char = char

                if not control_char or not notify_char:
                    print(f"{device_name}: Required characteristics not found")
                    return

                await client.start_notify(notify_char, lambda s, d: asyncio.create_task(handle_notification(s, d, device_name)))

                # Example: send 0x17 to die after connection
                await client.write_gatt_char(control_char, bytearray([0x17]))
                print(f"{device_name}: Sent 0x17")

                while client.is_connected:
                    await asyncio.sleep(1)

        except Exception as e:
            print(f"Failed to handle {device_name}: {e}")

        print(f"{device_name} disconnected, retrying in 3 seconds...")
        await asyncio.sleep(3)

async def monitor_dice():
    connected: Set[str] = set()
    tasks: Dict[str, asyncio.Task] = {}

    while True:
        devices = await BleakScanner.discover()
        go_dice_names = [d.name for d in devices if d.name and d.name.startswith(DEVICE_PREFIX)]

        for name in go_dice_names:
            if name not in connected:
                print(f"Found new dice: {name}")
                tasks[name] = asyncio.create_task(connect_dice(name))
                connected.add(name)

        to_remove = [name for name in connected if name not in go_dice_names]
        for name in to_remove:
            print(f"{name} is no longer available, will retry")
            connected.remove(name)

        await asyncio.sleep(5)

async def main():
    await sio.connect(SERVER_URL, auth={"uuid": "dice", "username": "BLE Proxy"})
    await monitor_dice()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Exiting on Ctrl+C...")