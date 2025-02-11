const { PrismaClient } = require('@prisma/client');
const { extractText } = require('../services/ocrService');
const { convertToXML } = require('../utils/xmlFormatter');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const natural = require('natural');
const classifier = new natural.BayesClassifier();

// Train the classifier with sample legal document types
const trainClassifier = () => {
  classifier.addDocument('civil court case complaint damages', 'CIVIL');
  classifier.addDocument('criminal case prosecution defendant', 'CRIMINAL');
  classifier.addDocument('family court custody divorce', 'FAMILY');
  classifier.addDocument('bankruptcy petition chapter', 'BANKRUPTCY');
  classifier.train();
};

// Initialize classifier
trainClassifier();

// Helper function to extract court location
const extractLocation = (text) => {
  const stateAbbreviations = ['NY', 'CA', 'TX', 'FL']; // Add more as needed
  const locationRegex = new RegExp(`\\b(${stateAbbreviations.join('|')})\\b`, 'g');
  const matches = text.match(locationRegex);
  return matches ? matches[0] : null;
};

// Helper function to extract monetary amounts
const extractAmounts = (text) => {
  const amountRegex = /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*dollars/gi;
  const matches = text.match(amountRegex);
  return matches ? matches.map(amount => amount.replace(/[^\d.]/g, '')) : [];
};

// Helper function to extract case details
const extractCaseDetails = (text) => {
  return {
    caseNumber: text.match(/case\s*(?:no\.?|number)\s*[:.]?\s*(\w+[-/]\d+)/i)?.[1],
    plaintiffs: text.match(/plaintiff[s]?[\s:]+([^v.\n]+)/i)?.[1]?.trim(),
    defendants: text.match(/defendant[s]?[\s:]+([^\n]+)/i)?.[1]?.trim(),
  };
};

// Upload Document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;

    // Extract text using preprocessing and OCR
    const extractedText = await extractText(filePath, mimeType);

    // Analyze the document
    const documentAnalysis = {
      type: classifier.classify(extractedText),
      location: extractLocation(extractedText),
      amounts: extractAmounts(extractedText),
      ...extractCaseDetails(extractedText),
      filingDate: extractedText.match(/filed[\s:]+([^\n]+)/i)?.[1]?.trim(),
      judgeName: extractedText.match(/judge[\s:]+([^\n]+)/i)?.[1]?.trim(),
    };

    let structuredData = {
      title: "Legal Document Analysis",
      extractedText,
      analysis: documentAnalysis,
      metadata: { 
        uploadedAt: new Date(), 
        type: mimeType,
        confidence: classifier.getClassifications(extractedText)[0].value
      },
    };

    let format = "Json";
    if (req.body.format === "XML") {
      structuredData = convertToXML(structuredData);
      format = "Xml";
    }

    // Save document metadata using Prisma - now matches schema exactly
    const document = await prisma.document.create({
      data: {
        originalName,
        text: extractedText,
        structuredData,
        format,
      },
    });

    fs.unlinkSync(filePath); // Delete local file after processing

    res.status(201).json({ 
      message: "File processed successfully", 
      document,
      analysis: documentAnalysis 
    });
  } catch (error) {
    console.error("Document processing error:", error.message);
    res.status(500).json({ error: "Failed to process the document" });
  }
};

// Get Document by ID
exports.getDocument = async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });

    res.status(200).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get All Documents
exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany();

    if (documents.length === 0) return res.status(404).json({ error: 'No documents found' });

    res.status(200).json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Update Document
exports.updateDocument = async (req, res) => {
  try {
    const updatedDocument = await prisma.document.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.status(200).json(updatedDocument);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Delete Document
exports.deleteDocument = async (req, res) => {
  try {
    await prisma.document.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// const Document = require("../models/documentModel");
// const { extractText } = require("../services/ocrService");
// const { convertToXML } = require("../utils/xmlFormatter");
// const fs = require("fs");

// exports.uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     const filePath = req.file.path;
//     const mimeType = req.file.mimetype;

//     // Extract text from PDF or image
//     const extractedText = await extractText(filePath, mimeType);

//     const structuredData = {
//       title: "Scanned Document",
//       extractedText,
//       metadata: { uploadedAt: new Date(), type: mimeType },
//     };

//     let formattedData = structuredData;
//     if (req.body.format === "XML") {
//       formattedData = convertToXML(structuredData);
//     }

//     const document = await Document.create({
//       originalName: req.file.originalname,
//       text: extractedText,
//       structuredData,
//       format: req.body.format || "JSON",
//     });

//     fs.unlinkSync(filePath); // Delete file after processing

//     res.status(201).json({ message: "File processed successfully", document });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.getDocument = async (req, res) => {
//   try {
//     const document = await Document.findById(req.params.id);
//     if (!document) return res.status(404).json({ error: "Document not found" });

//     res.status(200).json(document);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// //Get all Documents
// exports.getAllDocuments = async (req, res) => {
//   try {
//     const documents = await Document.find();

//     if (documents.length === 0) return res.status(404).json({ error: "No documents found" });
//     res.status(200).json(documents);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Update Document
// exports.updateDocument = async (req, res) => {
//   try {
//     const updatedDocument = await Document.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );

//     if (!updatedDocument) return res.status(404).json({ error: "Document not found" });

//     res.status(200).json(updatedDocument);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Delete Document
// exports.deleteDocument = async (req, res) => {
//   try {
//     const deletedDocument = await Document.findByIdAndDelete(req.params.id);

//     if (!deletedDocument) return res.status(404).json({ error: "Document not found" });

//     res.status(200).json({ message: "Document deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };