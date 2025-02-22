const { PrismaClient } = require('@prisma/client');
const { extractText } = require('../services/ocrService');
const { convertToXML } = require('../utils/xmlFormatter');
const path = require('path');
const vision = require('@google-cloud/vision');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs'); 

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
  const stateAbbreviations = ['NY', 'New York', 'CA', 'California', 'TX', 'Texas', 'FL', 'Florida'];
  const locationRegex = new RegExp(`\\b(?:${stateAbbreviations.join('|')})\\b`, 'g');
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
    claimants: text.match(/claimant[s]?[\s:]+([^\n]+)/i)?.[1]?.trim(),
    //Extract Date from the data
    filingDate: text.match(/filed\s*[:.]?\s*(\d{1,2}[stndrth]\s*[a-z]+\s*,\s*\d{4}|\d{2}-\d{2}-\d{4})/i)?.[1],
  };
};

// Upload Document
exports.uploadDocument = async (req, res) => {
  try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const mimeType = req.file.mimetype;
      const filePath = path.join(__dirname, '../uploads', req.file.originalname);
      fs.writeFileSync(filePath, req.file.buffer); // Save file to disk
      let extractedText = "";

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const base64Data = Buffer.from(req.file.buffer).toString("base64");
      let prompt = `
      Analyze this document and provide the following details in JSON format:
      {
        "date": "Date of the document",
        "type": "Type of document",
        "plaintiffs": ["List of plaintiffs"],
        "defendants": ["List of defendants"],
        "claimants": ["List of claimants"],
        "caseNumber": "The case number",
        "judge": "The judges name",
        "amount": "The amount of the case",
        "location": "The location of the case",
        "summary": "A brief summary of the document"
      }
      `;

      if (mimeType.startsWith("image/")) {
          prompt = `
          Analyze this image and provide the following details in JSON format:
          {
            "date": "Date of the document",
            "type": "Type of document",
            "plaintiffs": ["List of plaintiffs"],
            "defendants": ["List of defendants"],
            "claimants": ["List of claimants"],
            "caseNumber": "The case number",
            "judge": "The judges name",
            "amount": "The amount of the case",
            "location": "The location of the case",
            "summary": "A brief summary of the document"
          }
          `;
      }

      const result = await model.generateContent([
          {
              inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
              },
          },
          prompt,
      ]);

      extractedText = result.response.text();
      if (!extractedText) {
          extractedText = "Gemini was unable to process the provided document";
      }

      // Remove Markdown code block wrappers
      extractedText = extractedText.replace(/```json\n/g, '').replace(/```/g, '');

      let documentAnalysis = {};
      try {
          documentAnalysis = JSON.parse(extractedText);
      } catch (error) {
          console.error("Error parsing Gemini response:", error);
          documentAnalysis = { summary: extractedText }; // Fallback to raw text
      }

      let structuredData = {
          title: "Legal Document Analysis",
          extractedText,
          analysis: documentAnalysis,
          metadata: {
              uploadedAt: new Date(),
              type: mimeType,
          },
      };

      let format = "Json";
      if (req.body.format === "XML") {
          structuredData = convertToXML(structuredData);
          format = "Xml";
      }

      const document = await prisma.document.create({
          data: {
              originalName: req.file.originalname,
              text: JSON.stringify(documentAnalysis),
              structuredData,
              format,
          },
      });

      fs.unlinkSync(filePath);

      res.status(201).json({
          message: "File processed successfully",
          document,
          analysis: documentAnalysis,
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