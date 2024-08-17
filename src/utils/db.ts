import { Db, MongoClient, ServerApiVersion } from "mongodb";
import {
  User,
  Contexts,
  FindConfig,
  ChatObject,
  MedicineObject,
  PlanObject,
  ChatData,
} from "../types";

// Replace the placeholder with your Atlas connection string
const uri = process.env.DATABASE_URL as string;

type Collections = "users" | "contexts" | "chatStorage" | "medicine" | "plans";

type CollectionData =
  | User
  | Contexts
  | ChatObject
  | MedicineObject
  | PlanObject;

class DatabaseRoot {
  private readonly client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  getDBClient() {
    return this.client;
  }
  async runHealthCheck(): Promise<string> {
    let response: string;
    const client = this.getDBClient();
    console.log("## Client -> ", !!client);
    try {
      // Connect the client to the server (optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      response =
        "Pinged your deployment. You successfully connected to MongoDB!";
    } catch (e) {
      response = "Error!";
      console.log("Error in running health check: ", e);
    } finally {
      // Ensures that the client will close when you finish/error
      await this.client.close();
    }
    return response;
  }
}

class HealthifierDatabase {
  private dbInstance: Db;

  closeConnection = () => {};

  constructor(db: Db) {
    this.dbInstance = db;
  }

  private getCollection(collectionName: Collections) {
    return this.dbInstance.collection(collectionName);
  }

  get user() {
    return {
      get: this.getUser.bind(this),
      getAll: this.getAllUsers.bind(this),
      set: this.addUser.bind(this),
    };
  }

  get context() {
    return {
      get: this.getContext.bind(this),
      set: this.storeContext.bind(this),
      findAndReplace: async (
        findConfig: { uniqueUserId: string },
        contextData: Contexts
      ) => {
        const collectionInstance = await this.getCollection("contexts");
        return collectionInstance.findOneAndReplace(findConfig, contextData);
      },
    };
  }

  get chat() {
    return {
      get: async ({
        uniqueUserId,
      }: {
        uniqueUserId: string;
      }): Promise<ChatData[]> => {
        try {
          const collectionInstance = await this.getCollection("chatStorage");
          return collectionInstance
            .find({ uniqueUserId })
            .toArray()
            .then((dataList) => {
              return (dataList as unknown as ChatObject[]).reduce(
                (list, data) => {
                  const userMessageObj = {
                    message: data.a,
                    ts: data.ta,
                    sender: "user",
                  };
                  const aiMessageObj = {
                    message: data.b,
                    ts: data.tb,
                    sender: "ai",
                  };
                  list.push(userMessageObj as ChatData);
                  list.push(aiMessageObj as ChatData);
                  return list;
                },
                [] as ChatData[]
              );
            });
        } catch (e) {
          console.log("An error occurred while fetching chat data: ", e);
          return [] as ChatData[];
        }
      },
      getAllSortedByTimeStamp: async (uniqueUserId: string) => {
        const collectionInstance = await this.getCollection("chatStorage");
        return collectionInstance
          .find({ uniqueUserId })
          .sort({ timeStamp: 1 })
          .toArray();
      },
      set: (chatData: ChatObject) => {
        return this.insertDocument("chatStorage", chatData);
      },
    };
  }

  get medicineStore() {
    return {
      get: (findConfig: { uniqueUserId: string; name?: string }) => {
        return this.getCollection("medicine").find(findConfig).toArray();
      },
      set: (medicineObj: MedicineObject) => {
        return this.insertDocument("medicine", medicineObj);
      },
      del: async (medicineObj: { uniqueUserId: string; medicineId: string }) => {
        const collectionInstance = await this.getCollection("medicine");
        console.log("deleteRequest! ", medicineObj);
        return collectionInstance.deleteOne({
          uniqueUserId: medicineObj.uniqueUserId,
          medicineId: medicineObj.medicineId,
        });
      }
    };
  }

  get plans() {
    return {
      get: (findConfig: {
        uniqueUserId: string;
        planType?: string;
      }) => {
        return this.findDocument("plans", findConfig);
      },
      set: (planObj: PlanObject) => {
        return this.insertDocument("plans", planObj);
      },
      findAndReplace: async (
        findConfig: { uniqueUserId: string; planType: string },
        planObj: PlanObject
      ) => {
        const collectionInstance = await this.getCollection("plans");
        return collectionInstance.replaceOne(findConfig, planObj);
      },
    };
  }

  private async addUser(userData: User & { update?: boolean }): Promise<1 | 0> {
    if (userData.update) {
      delete userData.update;
      return this.updateDocument("users", userData);
    } else {
      return this.insertDocument("users", userData);
    }
  }

  private async storeContext(contextData: Contexts): Promise<1 | 0> {
    return this.insertDocument("contexts", contextData);
  }

  private async getUser(findConfig: FindConfig): Promise<User | null> {
    return this.findDocument<User>("users", findConfig || {});
  }

  private async getAllUsers(): Promise<User[]> {
    return this.getCollection("users").find({}).toArray() as unknown as User[];
  }

  private async getContext(findConfig: FindConfig): Promise<Contexts | null> {
    return this.findDocument<Contexts>("contexts", findConfig);
  }

  private async insertDocument<T>(
    collectionName: Collections,
    document: CollectionData
  ): Promise<1 | 0> {
    try {
      const collection = this.getCollection(collectionName);
      await collection.insertOne(document);
      return 1;
    } catch (e) {
      console.error(`Error in adding document to ${collectionName}: `, e);
      return 0;
    }
  }

  private async updateDocument<T>(
    collectionName: Collections,
    document: CollectionData
  ): Promise<1 | 0> {
    try {
      const { uniqueUserId } = document;
      if (!uniqueUserId) {
        return 0;
      }
      const collection = this.getCollection(collectionName);
      await collection.updateOne({ uniqueUserId }, { $set: document });
      return 1;
    } catch (e) {
      console.error(`Error in updating document in ${collectionName}: `, e);
      return 0;
    }
  }

  private async findDocument<T>(
    collectionName: Collections,
    findConfig: FindConfig
  ): Promise<T | null> {
    try {
      if (
        typeof findConfig !== "object" ||
        (!findConfig.contextId && !findConfig.email && !findConfig.uniqueUserId)
      ) {
        return null;
      }
      const collection = this.getCollection(collectionName);
      const document = await collection.findOne({ ...findConfig });
      return document as T | null;
    } catch (e) {
      console.error(`Error in getting document from ${collectionName}: `, e);
      return null;
    }
  }
}

const dbRoot = new DatabaseRoot();

const loadDataBase = (() => {
  let dbCollection: HealthifierDatabase | null = null;
  return async (dbName = "healthifier") => {
    if (dbCollection) {
      return dbCollection;
    }
    try {
      const dbClient = dbRoot.getDBClient();
      await dbClient.connect();
      const databaseInstance = await dbClient.db(dbName);
      dbCollection = new HealthifierDatabase(databaseInstance);
      dbCollection.closeConnection = () => {
        dbClient.close();
        dbCollection = null;
      };
    } catch (e) {
      console.log("Error in loading database: ", e);
    }
    return dbCollection;
  };
})();

const dbConfig = {
  loadDataBase,
  runHealthCheck: dbRoot.runHealthCheck.bind(dbRoot),
};

export { dbConfig };
