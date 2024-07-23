"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthifierSocketManager = void 0;
const socket_io_1 = require("socket.io");
const AIManager_1 = __importDefault(require("./AIManager"));
const db_1 = require("./utils/db");
const consts_1 = require("./consts");
const prompts_1 = require("./utils/prompts");
class HealthifierSocketManager {
    constructor(server) {
        this.connectionList = [];
        this.healthChatMaintainer = {};
        this.channelStore = {
            HEALTH_CHAT: {
                REQUEST: "health_chat.server.request",
                RESPONSE: "health_chat.server.response",
                END_CHAT: "health_chat.server.end_chat",
            },
        };
        this.server = server;
    }
    on(channelName, callback) {
        this.connectionList.push({ channel: channelName, callback });
    }
    initializeSocket() {
        console.log("initializing the socket!");
        const io = new socket_io_1.Server(this.server, {
            cors: {
                origin: "*", // Allowed origins
                methods: ["GET", "POST"], // Allowed methods
                allowedHeaders: ["Content-Type"], // Allowed headers
                credentials: true, // Allow credentials
            },
        });
        io.on("connection", (socket) => {
            var _a, _b;
            const uniqueUserId = (((_b = (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.query) === null || _b === void 0 ? void 0 : _b.uniqueUserId) || "");
            console.log("a user connected: ", uniqueUserId);
            for (let idx = 0; idx < this.connectionList.length; idx++) {
                const { channel, callback } = this.connectionList[idx];
                socket.on(channel, (...args) => {
                    callback(socket, ...args);
                });
            }
            socket.on("disconnect", () => {
                console.log("user disconnected: ", uniqueUserId);
                this.storeContextAndResetChatInstance(uniqueUserId);
            });
        });
        this.attachHealthChatChannel();
    }
    attachHealthChatChannel() {
        this.on(this.channelStore.HEALTH_CHAT.RESPONSE, async (socket, data) => {
            const { message, uniqueUserId, messageReceivedTime } = data || {};
            console.log("## message received: ", message);
            if (!uniqueUserId) {
                console.log("## uniqueUserId not found!");
                return;
            }
            const db = await db_1.dbConfig.loadDataBase();
            if (!this.healthChatMaintainer[uniqueUserId]) {
                const chatList = await (db === null || db === void 0 ? void 0 : db.chat.getAllSortedByTimeStamp(uniqueUserId));
                const conversationHistory = chatList === null || chatList === void 0 ? void 0 : chatList.slice(Math.max(0, chatList.length - 10)).map(({ a, b }) => {
                    if (a && b) {
                        return `User asked: ${a}, AI answered: ${b}`;
                    }
                    return "";
                });
                let initializingPrompt = `${prompts_1.MICRO_PROMPTS.ENSURE_HEALTH_CHAT}.`;
                if (conversationHistory && conversationHistory.length > 0) {
                    initializingPrompt += ` Here is the conversation history: ${conversationHistory.join(" ")}. Take its reference to address the user's queries.`;
                }
                console.log("## initializingPrompt: ", initializingPrompt);
                const chatInstance = await AIManager_1.default.startChat(initializingPrompt);
                this.healthChatMaintainer[uniqueUserId] = Object.assign({}, chatInstance);
            }
            const response = await this.healthChatMaintainer[uniqueUserId].sendMessage(`The user asked: ${message}. Answer this in a casual chat format. (refuse if not health related & keep the response short)`);
            const chatData = {
                a: message,
                b: response,
                ta: messageReceivedTime || new Date().toISOString(),
                tb: new Date().toISOString(),
                uniqueUserId
            };
            db === null || db === void 0 ? void 0 : db.chat.set(chatData);
            socket.emit(this.channelStore.HEALTH_CHAT.REQUEST, {
                message: response,
            });
        });
        this.on(this.channelStore.HEALTH_CHAT.END_CHAT, async (socket, data) => {
            const { uniqueUserId } = data || {};
            this.storeContextAndResetChatInstance(uniqueUserId);
        });
    }
    async storeContextAndResetChatInstance(uniqueUserId) {
        const storeChatContext = async (uniqueUserId, chatContext) => {
            try {
                const db = await db_1.dbConfig.loadDataBase();
                const dataObj = {
                    uniqueUserId,
                    contextId: consts_1.CONTEXT_IDs.HEALTH_CHAT,
                    contextData: chatContext,
                };
                console.log("## storing contextual data!");
                const response = await (db === null || db === void 0 ? void 0 : db.context.get({ uniqueUserId, contextId: consts_1.CONTEXT_IDs.HEALTH_CHAT }));
                if (response && response.contextData) {
                    try {
                        const aiResponse = await AIManager_1.default.getResponseFromGemini(`Make sense of these two texts: 1:${dataObj.contextData}, 2:${response.contextData}. And keep the response as short as possible (might as well keep them as keywords, just make sure it is understandable for future reference).`);
                        dataObj.contextData = aiResponse;
                        console.log("## Saving already present context data: ", aiResponse);
                    }
                    catch (e) { }
                }
                await (db === null || db === void 0 ? void 0 : db.context.set(dataObj));
            }
            catch (e) {
                console.log("## error in storeChatContext: ", e);
            }
        };
        if (!uniqueUserId) {
            console.log("## uniqueUserId not found!");
            return;
        }
        if (!this.healthChatMaintainer[uniqueUserId]) {
            console.log("## chat instance not found!");
            return;
        }
        const chatContext = await this.healthChatMaintainer[uniqueUserId].sendMessage(prompts_1.MICRO_PROMPTS.SUMMARISE_HEALTH_CHAT);
        await storeChatContext(uniqueUserId, chatContext);
        delete this.healthChatMaintainer[uniqueUserId];
    }
}
exports.HealthifierSocketManager = HealthifierSocketManager;
