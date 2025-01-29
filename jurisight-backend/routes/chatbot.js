const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const FLASK_BASE_URL = 'http://localhost:5000';

const chatbotRouter = express.Router();
const upload = multer();

chatbotRouter.post("/summarize", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
  
      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
  
      const response = await axios.post(`${ FLASK_BASE_URL }/summarize`, formData, {
        headers: formData.getHeaders(),
      });
  
      res.json(response.data);
    } catch (e) {
      res.status(500).json({ error: "Error communicating with summarization service" });
    }
});
  
chatbotRouter.post('/chat', async (req, res) => {
    try {
        const { message } = req.body; // Capture the message from the frontend
        const flaskResponse = await axios.post(`${ FLASK_BASE_URL }/chat`, { message }, {
            headers: { 'Content-Type': 'application/json' },
        }); // Forward to Flask
        res.json(flaskResponse.data); // Send Flask response back to the frontend
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch response from Flask API.' });
    }
});
  

chatbotRouter.post("/retrieve-cases", async (req, res) => {
    try {
        const { top_k } = req.body; // Extract top_k from the request body
        const response = await axios.post(`${ FLASK_BASE_URL }/retrieve-cases`, req.body);
        res.json(response.data);
    } catch(e) {
        console.error("Error in retrieve-cases:", e);
        res.status(500).json({ error: "Error communicating with case retrieval service. Please upload a pdf before retrieval" });
    }
});

module.exports = chatbotRouter;