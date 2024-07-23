"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AIManager_1 = __importDefault(require("../AIManager"));
const db_1 = require("../utils/db");
const consts_1 = require("../consts");
const contextRouter = express_1.default.Router();
contextRouter.get("/", (req, res) => {
    res.send("Context route is working!");
});
contextRouter.post("/storeInitialContext", async (req, res) => {
    try {
        const { questions, uniqueUserId } = req.body;
        if (!questions || !Array.isArray(questions)) {
            res.status(400).send("Questions are required!");
            return;
        }
        const chatInstance = await AIManager_1.default.startChat("This is a questionaire for understanding the user's health status. 1/n questions will be provided along with their answers in the next n requests. Your task is to remember them and return response when required.");
        for (const question of questions) {
            if (!question.a || !question.q) {
                continue;
            }
            const prompt = `question is: ${question.q} and answer is: ${question.a}`;
            const response = chatInstance.sendMessage(prompt);
            console.log("intermediate response: ", response, " for prompt: ", prompt);
        }
        const finalResponse = await chatInstance.sendMessage("All questions sent! Now create the contextual summary for this user to be used later (keep it short).");
        const db = await db_1.dbConfig.loadDataBase();
        await (db === null || db === void 0 ? void 0 : db.context.set({ uniqueUserId, contextId: consts_1.CONTEXT_IDs.HEALTH_QUESTIONAIRE, contextData: finalResponse }));
        res.send("Questions sent successfully!");
    }
    catch (e) {
        console.log("## error in /storeInitialContext: ", e);
        res.status(500).send("Error in storing initial context!");
    }
});
