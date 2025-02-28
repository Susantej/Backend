const express = require("express");
const { supabase } = require("./config/db");
const cors = require("cors");
require("dotenv").config();
const upload = require("./middleware/uploadMiddleware");

const documentRoutes = require("./routes/documentRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/auth/", authRoutes)
app.post('/api/documents/testupload', upload.single('file'), (req, res) => {
  console.log(req.file);
  res.send('Test upload');
});

app.get("/", (req, res) => {
  res.send("Document Parsing API is Running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// module.exports = app;


