const express = require("express");
const axios = require("axios");

const FLASK_BASE_URL = 'http://localhost:5000/chat';

const chatbotRouter = express.Router();

chatbotRouter.post("/summarize", async (req, res) => {
    try {
        const response = await axios.post(`${FLASK_BASE_URL}/summarize`, req.body);
        res.json(response.data);
    }
    catch(e) {
        res.status(500).json({ error: 'Error communicating with summarization service' });
    }
});

chatbotRouter.post('/chat', async (req, res) => {
    try {
        const { message } = req.body; // Capture the message from the frontend
        const flaskResponse = await axios.post(FLASK_BASE_URL, { query: message }); // Forward to Flask
        console.log('Flask Response:', flaskResponse.data);
        res.json(flaskResponse.data); // Send Flask response back to the frontend
    } catch (error) {
        console.error('Error communicating with Flask:', error.message);
        res.status(500).json({ error: 'Failed to fetch response from Flask API.' });
    }
});
  

chatbotRouter.post("/retrieve-cases", async (req, res) => {
    try {
        const response = await axios.post(`${FLASK_BASE_URL}/retrieval-cases`, req.body);
        res.json(response.data);
    } catch(e) {
        res.status(500).json({ error: "Error communicating with case retrieval service." });
    }
});

module.exports = chatbotRouter;