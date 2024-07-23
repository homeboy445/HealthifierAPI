import { Socket } from "socket.io";
import { Server } from "socket.io";
import AIManager from "./AIManager";
import { dbConfig } from "./utils/db";
import { CONTEXT_IDs } from "./consts";
import { MICRO_PROMPTS } from "./utils/prompts";

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
      const uniqueUserId = (socket.handshake?.query?.uniqueUserId || "") as string;
      console.log("a user connected: ", uniqueUserId);
      for (let idx = 0; idx < this.connectionList.length; idx++) {
        const { channel, callback } = this.connectionList[idx];
        socket.on(channel, (...args: any) => {
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
    this.on(
      this.channelStore.HEALTH_CHAT.RESPONSE,
      async (socket: Socket, data: any) => {
        const { message, uniqueUserId, messageReceivedTime } = data || {};
        console.log("## message received: ", message);
        if (!uniqueUserId) {
          console.log("## uniqueUserId not found!");
          return;
        }
        const db = await dbConfig.loadDataBase();
        if (!this.healthChatMaintainer[uniqueUserId]) {
          const chatList = await db?.chat.getAllSortedByTimeStamp(uniqueUserId);
          const conversationHistory = chatList?.slice(Math.max(0, chatList.length - 10)).map(({a, b}) => {
            if (a && b) {
              return `User asked: ${a}, AI answered: ${b}`;
            } return "";
          });
          let initializingPrompt = `${MICRO_PROMPTS.ENSURE_HEALTH_CHAT}.`;
          if (conversationHistory && conversationHistory.length > 0) {
            initializingPrompt += ` Here is the conversation history: ${conversationHistory.join(" ")}. Take its reference to address the user's queries.`;
          }
          console.log("## initializingPrompt: ", initializingPrompt);
          const chatInstance = await AIManager.startChat(initializingPrompt);
          this.healthChatMaintainer[uniqueUserId] = { ...chatInstance };
        }
        const response = await this.healthChatMaintainer[uniqueUserId].sendMessage(
          `The user asked: ${message}. Answer this in a casual chat format. (refuse if not health related & keep the response short)`
        );
        const chatData = {
          a: message,
          b: response,
          ta: messageReceivedTime || new Date().toISOString(),
          tb: new Date().toISOString(),
          uniqueUserId
        };
        db?.chat.set(chatData);
        socket.emit(this.channelStore.HEALTH_CHAT.REQUEST, {
          message: response,
        });
      }
    );
    this.on(this.channelStore.HEALTH_CHAT.END_CHAT, async (socket: Socket, data: any) => {
      const { uniqueUserId } = data || {};
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
