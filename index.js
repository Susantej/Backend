const express = require("express");
const { supabase } = require("./config/db");
const cors = require("cors");
require("dotenv").config();

const documentRoutes = require("./routes/documentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/documents", documentRoutes);

app.get("/", (req, res) => {
  res.send("Document Parsing API is Running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


