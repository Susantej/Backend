const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const documentController = require("../controllers/documentController");
const authMiddleware = require('../middleware/authMiddleware');

router.post("/upload", authMiddleware, upload.single("file"), documentController.uploadDocument);
router.get("/:id", authMiddleware, documentController.getDocument);
router.get("/all-documents", authMiddleware, documentController.getAllDocuments);
router.put("/update-document/:id",  authMiddleware, documentController.updateDocument);
router.delete("/delete-document/:id",authMiddleware, documentController.deleteDocument);

module.exports = router;
