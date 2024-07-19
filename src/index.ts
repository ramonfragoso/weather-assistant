import express from "express";
require('dotenv').config()

import cors from "cors";
import bodyParser from "body-parser"; // Import body-parser
import openaiMiddleware from "./location.middleware";

declare global {
  namespace Express {
    interface Request {
      openWeatherData?: any; // Use "any" for now if the type is unknown
    }
  }
}

const port = 3001;

const app = express();

const corsOptions = cors();
app.use(corsOptions);
app.use(bodyParser.json());

app.post("/chat", openaiMiddleware, (req, res) => {
  res.send("Hello from the TypeScript Node.js HTTP API!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
