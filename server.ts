import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // Socket.io Logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_auction", (auctionId) => {
      socket.join(`auction:${auctionId}`);
      console.log(`User ${socket.id} joined auction ${auctionId}`);
    });

    socket.on("place_bid", (data) => {
      // data: { auctionId, bidderId, amount, bidderEmail }
      console.log("New bid placed:", data);
      // Broadcast to everyone in the auction room
      io.to(`auction:${data.auctionId}`).emit("bid_update", data);
      
      // Notify others they've been outbid (simplified logic)
      socket.to(`auction:${data.auctionId}`).emit("outbid_notification", {
        auctionId: data.auctionId,
        newAmount: data.amount,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "BidForge API is running" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
