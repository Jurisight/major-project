const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const auth = require("../middleware/auth");

dotenv.config();

const authRouter = express.Router();

const redirectUrl = 'http://localhost:3000/api/auth/callback';

const oAuth2Client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    redirectUrl
);

async function getUserData(access_token) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token${access_token}`);
    if (!response.ok) {
        throw new Error("Failed to fetch user data from Google");
    }
    return await response.json();
}

authRouter.post("/google-auth-url", (req, res) => {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
        prompt: "consent",
    });
    res.json({ url: authorizeUrl });
});

authRouter.get("/callback", async (req, res) => {
    const code = req.query.code;

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        const userInfo = await getUserData(tokens.access_token);

        let user = await User.findOne({ email: userInfo.email });
        if (!user) {
            user = new User({
                email: userInfo.email,
                name: userInfo.name,
                password: "",
            });
            await user.save();
        }

        const jwtToken = jwt.sign({ id: user._id }, "passwordKey");
        res.json({ token: jwtToken, ...user._doc });
    } catch(e) {
        console.error("Error during Google Authentication process:", e);
        res.status(500).json({ error: "Failed to authenticate with Google." });
    }
});

authRouter.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                msg: "User with same email already exists!"
            });
        }

        const hashedPassword = await bcryptjs.hash(password, 8);
        let user = new User({
            email,
            password: hashedPassword,
            name,
        });
        user = await user.save();

        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

authRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "User with this email does not exist! "});
        }

        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                msg: "Incorrect password"
            });
        }

        const token = jwt.sign({ id: user._id }, "passwordKey");
        res.json({ token, ...user._doc });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

authRouter.post("/tokenIsValid", async (req, res) => {
    try {
        const token = req.header("x-auth-token");
        if (!token) return res.json(false);

        const verified = jwt.verify(token, "passwordKey");
        if (!verified) return res.json(false);

        const user = await User.findById(verified.id);
        if (!user) return res.json(false);
        
        res.json(true);      
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

authRouter.get("/", auth, async (req, res) => {
    const user = await User.findById(req.user);
    res.json({ ...user._doc, token: req.token });
});

module.exports = authRouter;