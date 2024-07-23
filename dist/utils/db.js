"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
const mongodb_1 = require("mongodb");
// Replace the placeholder with your Atlas connection string
const uri = process.env.DATABASE_URL;
// console.log("## URI -> ", uri);
class DatabaseRoot {
    constructor() {
        this.client = new mongodb_1.MongoClient(uri, {
            serverApi: {
                version: mongodb_1.ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });
    }
    getDBClient() {
        return this.client;
    }
    async runHealthCheck() {
        let response;
        const client = this.getDBClient();
        console.log("## Client -> ", !!client);
        try {
            // Connect the client to the server (optional starting in v4.7)
            await client.connect();
            // Send a ping to confirm a successful connection
            await client.db("admin").command({ ping: 1 });
            response =
                "Pinged your deployment. You successfully connected to MongoDB!";
        }
        catch (e) {
            response = "Error!";
            console.log("Error in running health check: ", e);
        }
        finally {
            // Ensures that the client will close when you finish/error
            await this.client.close();
        }
        return response;
    }
}
class HealthifierDatabase {
    constructor(db) {
        this.closeConnection = () => { };
        this.dbInstance = db;
    }
    getCollection(collectionName) {
        return this.dbInstance.collection(collectionName);
    }
    get user() {
        return {
            get: this.getUser.bind(this),
            set: this.addUser.bind(this)
        };
    }
    get context() {
        return {
            get: this.getContext.bind(this),
            set: this.storeContext.bind(this),
            findAndReplace: async (findConfig, contextData) => {
                const collectionInstance = await this.getCollection("contexts");
                return collectionInstance.findOneAndReplace(findConfig, contextData);
            }
        };
    }
    get chat() {
        return {
            get: async ({ uniqueUserId }) => {
                const collectionInstance = await this.getCollection("chatStorage");
                return collectionInstance.find({ uniqueUserId }).toArray();
            },
            getAllSortedByTimeStamp: async (uniqueUserId) => {
                const collectionInstance = await this.getCollection("chatStorage");
                return collectionInstance.find({ uniqueUserId }).sort({ timeStamp: 1 }).toArray();
            },
            set: (chatData) => {
                return this.insertDocument("chatStorage", chatData);
            }
        };
    }
    get medicineStore() {
        return {
            get: (findConfig) => {
                return this.getCollection("medicine").find(findConfig).toArray();
            },
            set: (medicineObj) => {
                return this.insertDocument("medicine", medicineObj);
            }
        };
    }
    async addUser(userData) {
        return this.insertDocument("users", userData);
    }
    async storeContext(contextData) {
        return this.insertDocument("contexts", contextData);
    }
    async getUser(findConfig) {
        if (!findConfig) {
            // for getting all the users!
            const data = (await this.getCollection("users").find({}).toArray());
            return data;
        }
        else {
            return this.findDocument("users", findConfig || {});
        }
    }
    async getContext(findConfig) {
        return this.findDocument("contexts", findConfig);
    }
    async insertDocument(collectionName, document) {
        try {
            const collection = this.getCollection(collectionName);
            await collection.insertOne(document);
            return 1;
        }
        catch (e) {
            console.error(`Error in adding document to ${collectionName}: `, e);
            return 0;
        }
    }
    async findDocument(collectionName, findConfig) {
        try {
            const { email, uniqueUserId, contextId } = findConfig;
            console.log("config -> ", findConfig);
            if (!uniqueUserId || (!email && !contextId)) {
                return null;
            }
            const collection = this.getCollection(collectionName);
            const document = await collection.findOne(Object.assign({}, findConfig));
            return document;
        }
        catch (e) {
            console.error(`Error in getting document from ${collectionName}: `, e);
            return null;
        }
    }
}
const dbRoot = new DatabaseRoot();
const loadDataBase = (() => {
    let dbCollection = null;
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
            };
        }
        catch (e) {
            console.log("Error in loading database: ", e);
        }
        return dbCollection;
    });
})();
const dbConfig = { loadDataBase, runHealthCheck: dbRoot.runHealthCheck.bind(dbRoot) };
exports.dbConfig = dbConfig;
