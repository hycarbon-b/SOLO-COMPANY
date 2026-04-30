import asyncio
import websockets
import json
import uuid

URI = "ws://localhost:18789/ws"
TOKEN = "b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3"

async def main():
    async with websockets.connect(URI) as ws:

        challenge = await ws.recv()
        print("challenge:", challenge)

        connect_msg = {
            "type": "req",
            "id": "测试-" + str(uuid.uuid4()),
            "method": "connect",
            "params": {
                "minProtocol": 3,
                "maxProtocol": 3,
                "client": {
                    "id": "openclaw-control-ui",
                    "version": "1.0",
                    "platform": "python",
                    "mode": "operator"
                },
                "role": "operator",
                "scopes": ["operator.read", "operator.write"],
                "auth": {
                    "token": TOKEN
                }
            }
        }

        await ws.send(json.dumps(connect_msg))

        res = await ws.recv()
        print("connect response:", res)

        while True:
            msg = await ws.recv()
            print("event:", msg)

# ✅ 正确入口
if __name__ == "__main__":
    asyncio.run(main())