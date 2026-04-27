const dotenv = require("dotenv");
dotenv.config();

 

const nodemailer = require('nodemailer');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(bodyParser.json());

// Create test account and transporter
let transporter;

nodemailer.createTestAccount().then(testAccount => {
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  console.log("Ethereal test account created:");
  console.log("User:", testAccount.user);
  console.log("Pass:", testAccount.pass);
}).catch(err => {
  console.error("Failed to create test account:", err);
});

// Route to handle form submission
app.post('/signup', async (req, res) => {
  const { name, email, startDate } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  if (!transporter) {
    return res.status(503).json({ message: 'Email service not ready. Try again shortly.' });
  }

  try {
    const info = await transporter.sendMail({
      from: '"Clarity Challenge" <welcome@claritychallenge.com>',
      to: email,
      subject: "Your Simple Offer Blueprint is Ready ✨",
html: `
  <h2>Hi ${name},</h2>

  <p>Your Simple Offer Blueprint is ready.</p>

  <p>You now have a clear direction on what to create and how to move forward.</p>

  <p>Next step: take action while the clarity is fresh.</p>

  <br>

  <em>Keep it simple,</em><br>
  The Clarity System
`
    });

    console.log("Email sent:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    res.status(200).json({ message: 'Signup received. Welcome aboard!' });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ message: 'Signup received, but email failed.' });
  }
});

app.post('/simple-offer', async (req, res) => {
  console.log("Simple offer route hit");

  try {
    const { answers, audience, problem } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length < 11) {
      return res.status(400).json({
        error: "Please provide answers for all 11 questions."
      });
    }

    const SYSTEM_PROMPT = `
You are The Simple Offer Decision Engine.

Analyse the user's answers and return a clear, decisive recommendation for their first digital offer.

Return ONLY valid JSON.
Do not include markdown.
Do not explain the system.
Do not teach.
Do not give multiple unrelated options.

Profiles:
A = Educator
B = Strategist
C = Creator
D = Automator
E = Community Builder
F = Consultant

Scoring:
Questions 1–5: +2 points to selected profile.
Question 6: +3 points to selected profile.
Question 7: -2 points from selected profile.
Question 8: -2 points from selected profile.

Model mapping:
Educator = Mini-course, guide
Strategist = Audit, framework
Creator = Template pack, digital product
Automator = Toolkit, dashboard, workflow system
Community Builder = Challenge, micro-membership
Consultant = Audit, clarity session, strategy kit

Rules:
- Choose the strongest profile after scoring.
- Apply the audience, problem, time, interaction, and delivery constraints.
- Recommend a Primary Path and Secondary Path.
- Primary Path should be the simplest viable path.
- Secondary Path should be a close backup.
- Make the language sharp, premium, and decisive.

- Always return full profile names (e.g., "Educator", not "A")
{
  "profile": "",
  "strengthPattern": "",
  "primaryPath": "",
  "secondaryPath": "",
  "starterOffer": "",
  "decisionFrame": "",
  "nextStep": ""
}
`;

    const userInput = {
      answers,
      audience: audience || "busy people who want clarity",
      problem: problem || "confusion and overthinking"
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userInput) }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    res.json(result);

  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({
      error: error.message || "Something went wrong"
    });
  }
});

// Start server
app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
