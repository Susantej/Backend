const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  originalName: String,
  text: String,
  structuredData: Object,
  format: { type: String, enum: ["JSON", "XML"], default: "JSON" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Document", DocumentSchema);
