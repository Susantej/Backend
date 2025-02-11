const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const documentController = require("../controllers/documentController");

router.post("/upload", upload.single("file"), documentController.uploadDocument);
router.get("/:id", documentController.getDocument);
router.get("/all-documents", documentController.getAllDocuments);
router.put("/update-document/:id", documentController.updateDocument);
router.delete("/delete-document/:id", documentController.deleteDocument);

module.exports = router;
