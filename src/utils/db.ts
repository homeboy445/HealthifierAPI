import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { User, Contexts, FindConfig, ChatObject, MedicineObject } from "../types";

// Replace the placeholder with your Atlas connection string
const uri = process.env.DATABASE_URL as string;

type Collections = "users" | "contexts" | "chatStorage" | "medicine";

type CollectionData = User | Contexts | ChatObject | MedicineObject;

// console.log("## URI -> ", uri);

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
      set: this.addUser.bind(this)
    }
  }

  get context() {
    return {
      get: this.getContext.bind(this),
      set: this.storeContext.bind(this),
      findAndReplace: async (findConfig: { uniqueUserId: string }, contextData: Contexts) => {
        const collectionInstance = await this.getCollection("contexts");
        return collectionInstance.findOneAndReplace(findConfig, contextData);
      }
    }
  }

  get chat() {
    return {
      get: async ({ uniqueUserId }: { uniqueUserId: string }) => {
        const collectionInstance = await this.getCollection("chatStorage");
        return collectionInstance.find({ uniqueUserId }).toArray();
      },
      getAllSortedByTimeStamp: async (uniqueUserId: string) => {
        const collectionInstance = await this.getCollection("chatStorage");
        return collectionInstance.find({ uniqueUserId }).sort({ timeStamp: 1 }).toArray();
      },
      set: (chatData: ChatObject) => {
        return this.insertDocument("chatStorage", chatData);
      }
    }
  }

  get medicineStore() {
    return {
      get: (findConfig: { uniqueUserId: string; name?: string; }) => {
        return this.getCollection("medicine").find(findConfig).toArray();
      },
      set: (medicineObj: MedicineObject) => {
        return this.insertDocument("medicine", medicineObj);
      }
    }
  }

  private async addUser(userData: User): Promise<1 | 0> {
    return this.insertDocument("users", userData);
  }

  private async storeContext(contextData: Contexts): Promise<1 | 0> {
    return this.insertDocument("contexts", contextData);
  }

  private async getUser(findConfig?: FindConfig): Promise<User | User[] | null> {
    if (!findConfig) {
      // for getting all the users!
      const data = (await this.getCollection("users").find({}).toArray()) as unknown as User[];
      return data;
    } else {
      return this.findDocument<User>("users", findConfig || {});
    }
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

  private async findDocument<T>(
    collectionName: Collections,
    findConfig: FindConfig
  ): Promise<T | null> {
    try {
      const { email, uniqueUserId, contextId } = findConfig;
      console.log("config -> ", findConfig);
      if (!uniqueUserId || (!email && !contextId)) {
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
    return (async (dbName = "healthifier") => {
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
          }
        } catch (e) {
          console.log("Error in loading database: ", e);
        }
        return dbCollection;
    });
})();

const dbConfig = { loadDataBase, runHealthCheck: dbRoot.runHealthCheck.bind(dbRoot) };

export { dbConfig };
