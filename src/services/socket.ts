import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect_error", (err) => {
        console.warn("Socket connection warning:", err.message);
      });

      this.socket.on("error", (err) => {
        console.error("Socket error:", err);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinAuction(auctionId: string) {
    this.socket?.emit("join_auction", auctionId);
  }

  placeBid(data: { auctionId: string; bidderId: string; amount: number; bidderEmail: string }) {
    this.socket?.emit("place_bid", data);
  }

  onBidUpdate(callback: (data: any) => void) {
    this.socket?.on("bid_update", callback);
  }

  onOutbid(callback: (data: any) => void) {
    this.socket?.on("outbid_notification", callback);
  }
}

export const socketService = new SocketService();
