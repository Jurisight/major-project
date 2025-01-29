const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const authRouter = require("./routes/auth");
const chatbotRouter = require('./routes/chatbot');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(authRouter);
app.use(chatbotRouter);
app.use(express.static(path.join(__dirname,'public')));

const DB = "mongodb+srv://jurisight:5163441@main-project.ccqea.mongodb.net/jurisight?retryWrites=true&w=majority&appName=main-project";

mongoose.connect(DB).then(() => {
    console.log("Connection Successful");
}).catch((e) => {
    console.log(e);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Connected at port ${PORT}`);
    const open = await import("open");
    await open.default(`http://localhost:${PORT}/login`);
});
