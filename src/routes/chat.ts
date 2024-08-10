import express from 'express';
import { FAILURE_TYPES, RESPONSE_MESSAGE_CONST } from '../consts';
import { ExtendedRequest } from '../types';
import { dbConfig } from '../utils/db';

const chatRoute = express.Router();

chatRoute.get("/", (req, res) => {
    res.send("Route's operational!");
});

chatRoute.get("/all", async (req, res) => {
    const { uniqueUserId } = (req as ExtendedRequest).userData;
    try {
        const db = await dbConfig.loadDataBase();
        const chatData = await db?.chat.get({ uniqueUserId });
        console.log("chatData: ", chatData?.length);
        res.json(chatData);
    }
    catch (e) {
        console.log("## error while fetching chat data: ", e);
        res.status(500).send(FAILURE_TYPES.CHAT_FAILURES.ERROR_FETCH_CHAT);
    }
});

export { chatRoute };
