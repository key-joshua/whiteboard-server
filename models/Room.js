const mongoose = require("mongoose")

const strokeSchema = new mongoose.Schema({
  id: String,
  points: [{ x: Number, y: Number }],
  color: String,
  width: Number,
  timestamp: { type: Date, default: Date.now },
})

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  drawingData: [strokeSchema],
  activeUsers: {
    type: Number,
    default: 0,
  },
})

roomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 })

module.exports = mongoose.model("Room", roomSchema)
