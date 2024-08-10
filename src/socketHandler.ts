import { Socket } from "socket.io";
import { Server } from "socket.io";
import AIManager from "./AIManager";
import { dbConfig } from "./utils/db";
import { CONTEXT_IDs } from "./consts";
import { MICRO_PROMPTS } from "./utils/prompts";
import JWTGenerator from "./utils/jwtUtils";

export class HealthifierSocketManager {
  server: unknown;

  connectionList: { channel: string; callback: (...args: any[]) => void }[] =
    [];

  healthChatMaintainer: {
    [UUID: string]: {
      sendMessage: (prompt: string) => Promise<string>;
    };
  } = {};

  channelStore = {
    HEALTH_CHAT: {
      REQUEST: "health_chat.server.request",
      RESPONSE: "health_chat.server.response",
      END_CHAT: "health_chat.server.end_chat",
    },
    AUTH: {
      UNAUTHORIZED: "UNAUTHORIZED",
    }
  };

  constructor(server: unknown) {
    this.server = server;
  }

  on(channelName: string, callback: (...args: any[]) => void) {
    this.connectionList.push({ channel: channelName, callback });
  }

  initializeSocket() {
    console.log("initializing the socket!");
    const io = new Server(this.server as any, {
      cors: {
        origin: "*", // Allowed origins
        methods: ["GET", "POST"], // Allowed methods
        allowedHeaders: ["Content-Type"], // Allowed headers
        credentials: true, // Allow credentials
      },
    });
    io.on("connection", (socket) => {
      const { accessToken } = (socket.handshake?.query || {});
      console.log("AccessToken received: ", accessToken);
      const tokenVerificationResult = JWTGenerator.verifyAccessToken(accessToken);
      console.log("a user connected!");
      if (!tokenVerificationResult) {
        socket.emit(this.channelStore.AUTH.UNAUTHORIZED, "Invalid token!");
        socket.on("disconnect", () => {
          console.log("disconnecting the unauthorised user!");
        });
        return;
      }
      (socket as any).auth = tokenVerificationResult;
      for (let idx = 0; idx < this.connectionList.length; idx++) {
        const { channel, callback } = this.connectionList[idx];
        socket.on(channel, (...args: any) => {
          callback(socket, ...args);
        });
      }
      socket.on("disconnect", () => {
        console.log("user disconnected!");
        this.storeContextAndResetChatInstance("change-this!");
      });
    });
    this.attachHealthChatChannel();
  }

  attachHealthChatChannel() {
    this.on(
      this.channelStore.HEALTH_CHAT.RESPONSE,
      async (socket: Socket, data: any) => {
        const { message, ts } = data || {};
        // console.log("## message received: ", message);
        const { uniqueUserId } = (socket as any).auth;
        if (!uniqueUserId) {
          console.log("## uniqueUserId not found!");
          return;
        }
        // console.log("Chatting with -> -> ", uniqueUserId);
        const db = await dbConfig.loadDataBase();
        if (!this.healthChatMaintainer[uniqueUserId]) {
          const chatList = await db?.chat.getAllSortedByTimeStamp(uniqueUserId);
          const conversationHistory = chatList?.slice(Math.max(0, chatList.length - 10)).map(({a, b}) => {
            if (a && b) {
              return `User asked: ${a}, AI answered: ${b}`;
            } return "";
          });
          console.log(">> ", conversationHistory);
          let initializingPrompt = `${MICRO_PROMPTS.ENSURE_HEALTH_CHAT}.`;
          if (conversationHistory && conversationHistory.length > 0) {
            initializingPrompt += ` Here is the conversation history: ${conversationHistory.join(" ")}. Take its reference to address the user's queries.`;
          }
          console.log("## initializingPrompt: ", initializingPrompt);
          const chatInstance = await AIManager.startChat(initializingPrompt);
          this.healthChatMaintainer[uniqueUserId] = { ...chatInstance };
        }
        const response = await this.healthChatMaintainer[uniqueUserId].sendMessage(
          `The user asked: ${message}. Answer this in a casual chat format. (refuse if not health related & keep the response short and be nice!)`
        );
        const chatData = {
          a: message,
          b: response,
          ta: ts || new Date().toISOString(),
          tb: new Date().toISOString(),
          uniqueUserId
        };
        // console.log("sending chat data: ", chatData);
        db?.chat.set(chatData);
        socket.emit(this.channelStore.HEALTH_CHAT.REQUEST, {
          message: response,
          ts: chatData.tb,
          sender: "ai"
        });
      }
    );
    this.on(this.channelStore.HEALTH_CHAT.END_CHAT, async (socket: Socket, data: any) => {
      const { uniqueUserId } = (socket as any).auth || {};
      this.storeContextAndResetChatInstance(uniqueUserId);
    });
  }

  async storeContextAndResetChatInstance(uniqueUserId: string) {
    const storeChatContext = async (
      uniqueUserId: string,
      chatContext: string
    ) => {
      try {
        const db = await dbConfig.loadDataBase();
        const dataObj = {
          uniqueUserId,
          contextId: CONTEXT_IDs.HEALTH_CHAT,
          contextData: chatContext,
        };
        console.log("## storing contextual data!");
        const response = await db?.context.get(
          { uniqueUserId, contextId: CONTEXT_IDs.HEALTH_CHAT });
        if (response && response.contextData) {
          try {
            const aiResponse = await AIManager.getResponseFromGemini(`Make sense of these two texts: 1:${dataObj.contextData}, 2:${response.contextData}. And keep the response as short as possible (might as well keep them as keywords, just make sure it is understandable for future reference).`);
            dataObj.contextData = aiResponse;
            console.log("## Saving already present context data: ", aiResponse);
          } catch (e) {}
        }
        await db?.context.set(dataObj);
      } catch (e) {
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
    const chatContext = await this.healthChatMaintainer[uniqueUserId].sendMessage(MICRO_PROMPTS.SUMMARISE_HEALTH_CHAT);
    await storeChatContext(uniqueUserId, chatContext);
    delete this.healthChatMaintainer[uniqueUserId];
  }
}
