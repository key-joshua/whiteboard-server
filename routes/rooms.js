const express = require("express")
const Room = require("../models/Room")
const router = express.Router()

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Join or create a room
router.post("/join", async (req, res) => {
  try {
    let { roomId } = req.body

    // If no roomId provided, generate one
    if (!roomId) {
      roomId = generateRoomId()
    }

    // Find or create room
    let room = await Room.findOne({ roomId })

    if (!room) {
      room = new Room({ roomId })
      await room.save()
    } else {
      // Update last activity
      room.lastActivity = new Date()
      await room.save()
    }

    res.json({
      success: true,
      roomId: room.roomId,
      drawingData: room.drawingData,
      activeUsers: room.activeUsers,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get room info
router.get("/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params
    const room = await Room.findOne({ roomId })

    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" })
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        drawingData: room.drawingData,
        activeUsers: room.activeUsers,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
