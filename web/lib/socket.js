import { io } from "socket.io-client";

const url = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

// ✅ 소켓을 딱 1번만 생성해서 export (싱글톤)
export const socket = io(url, {
  transports: ["websocket"],
  autoConnect: true,
});
