const http = require("http")
const cors = require("cors")
const express = require("express")
const mongoose = require("mongoose")
const socketIo = require("socket.io")

require("dotenv").config()

const Room = require("./models/Room")
const roomRoutes = require("./routes/rooms")

const app = express()
const PORT = process.env.PORT || 9000
const server = http.createServer(app)

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api/rooms", roomRoutes)

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err))

const roomUsers = new Map()

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("join-room", async (roomId) => {
    try {
      socket.join(roomId)
      socket.roomId = roomId

      // Add user to room tracking
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set())
      }
      roomUsers.get(roomId).add(socket.id)

      // Update room user count in database
      await Room.findOneAndUpdate(
        { roomId },
        {
          activeUsers: roomUsers.get(roomId).size,
          lastActivity: new Date(),
        },
      )

      // Notify room about user count update
      io.to(roomId).emit("user-count-update", roomUsers.get(roomId).size)

      console.log(`User ${socket.id} joined room ${roomId}`)
    } catch (error) {
      console.error("Error joining room:", error)
    }
  })

  socket.on("draw-start", (data) => {
    socket.to(socket.roomId).emit("draw-start", data)
  })

  socket.on("draw-move", (data) => {
    socket.to(socket.roomId).emit("draw-move", data)
  })

  socket.on("draw-end", async (data) => {
    try {
      // Save stroke to database
      await Room.findOneAndUpdate(
        { roomId: socket.roomId },
        {
          $push: { drawingData: data.stroke },
          lastActivity: new Date(),
        },
      )

      socket.to(socket.roomId).emit("draw-end", data)
    } catch (error) {
      console.error("Error saving stroke:", error)
    }
  })

  socket.on("cursor-move", (data) => {
    socket.to(socket.roomId).emit("cursor-move", {
      ...data,
      userId: socket.id,
    })
  })

  socket.on("clear-canvas", async () => {
    try {
      await Room.findOneAndUpdate(
        { roomId: socket.roomId },
        {
          drawingData: [],
          lastActivity: new Date(),
        },
      )

      io.to(socket.roomId).emit("canvas-cleared")
    } catch (error) {
      console.error("Error clearing canvas:", error)
    }
  })

  socket.on("disconnect", async () => {
    try {
      if (socket.roomId && roomUsers.has(socket.roomId)) {
        roomUsers.get(socket.roomId).delete(socket.id)

        const userCount = roomUsers.get(socket.roomId).size

        // Update database
        await Room.findOneAndUpdate(
          { roomId: socket.roomId },
          {
            activeUsers: userCount,
            lastActivity: new Date(),
          },
        )

        // Notify room about user count update
        io.to(socket.roomId).emit("user-count-update", userCount)

        // Clean up empty room tracking
        if (userCount === 0) {
          roomUsers.delete(socket.roomId)
        }
      }

      console.log("User disconnected:", socket.id)
    } catch (error) {
      console.error("Error handling disconnect:", error)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
