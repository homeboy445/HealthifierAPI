"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
class AIManager {
    constructor() {
        if (process.env.GEMINI_API_KEY) {
            // Access your API key as an environment variable (see "Set up your API key" above)
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        }
        else {
            throw new Error("API key not found!");
        }
    }
    async getResponseFromGemini(prompt = "Give some random story!") {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text.trim();
    }
    async processPromptListAsyncly(promptList, queryPromptString) {
        const chatInstance = this.model.startChat();
        await chatInstance.sendMessage(queryPromptString);
        for (const prompt of promptList) {
            await chatInstance.sendMessage("Store this text for now: " + prompt);
        }
        const result = await chatInstance.sendMessage("Now summarise the content of the previously sent text!");
        return result.response.text().trim();
    }
    async startChat(initialPrompt) {
        const chatInstance = this.model.startChat();
        const handler = {
            sendMessage: async (prompt) => {
                try {
                    const result = await chatInstance.sendMessage(prompt);
                    return result.response.text().trim();
                }
                catch (e) {
                    console.log("## error at sendMessage! ", e);
                    return "Failed!";
                }
            }
        };
        await handler.sendMessage(initialPrompt);
        return handler;
    }
}
exports.default = new AIManager();
