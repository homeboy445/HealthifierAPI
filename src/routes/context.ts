import express from "express";
import AIManager from "../AIManager";
import { ExtendedRequest, HealthQuestionaire } from "../types";
import { dbConfig } from "../utils/db";
import { CONTEXT_IDs } from "../consts";
const contextRouter = express.Router();

contextRouter.get("/", (req, res) => {
  res.send("Context route is working!");
});

contextRouter.post("/storeInitialContext", async (req, res) => {
    try {
        const { questions } = req.body as { questions: HealthQuestionaire; uniqueUserId: string };
        const { uniqueUserId } = (req as ExtendedRequest).userData;
        if (!questions || !Array.isArray(questions)) {
            res.status(400).send("Questions are required!");
            return;
        }
        const chatInstance = await AIManager.startChat("This is a questionaire for understanding the user's health status. 1/n questions will be provided along with their answers in the next n requests. Your task is to remember them and return response when required.");
        for (const question of questions) {
            if (!question.a || !question.q) {
                continue;
            }
            const prompt = `question is: ${question.q} and answer is: ${question.a}`;
            const response = chatInstance.sendMessage(prompt);
            console.log("intermediate response: ", response, " for prompt: ", prompt);
        }
        const finalResponse = await chatInstance.sendMessage("All questions sent! Now create the contextual summary for this user to be used later (keep it short).");
        const db = await dbConfig.loadDataBase();
        await db?.context.set({ uniqueUserId, contextId: CONTEXT_IDs.HEALTH_QUESTIONAIRE, contextData: finalResponse });
        res.send("Questions sent successfully!");
    } catch (e) {
        console.log("## error in /storeInitialContext: ", e);
        res.status(500).send("Error in storing initial context!");
    }
});

export { contextRouter };
