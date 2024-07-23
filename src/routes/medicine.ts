import { RESPONSE_MESSAGE_CONST } from "./../consts";
import express from "express";
import { MedicineObject } from "../types";
import { dbConfig } from "../utils/db";

const medicineRouter = express.Router();

medicineRouter.get("/", (req, res) => {
  res.send("Medicine route's operational!");
});

medicineRouter.get("/all/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const db = await dbConfig.loadDataBase();
    const medicines = await db?.medicineStore.get({ uniqueUserId: id }) || [];
    res.json(medicines);
  } catch (e) {
    console.log("## error in /medicine/all: ", e);
    res.status(500).send("Error in fetching medicine!");
  }
});

medicineRouter.post("/store", async (req, res) => {
  try {
    const { uniqueUserId, ...medicine } = req.body as {
      uniqueUserId: string;
    } & MedicineObject;
    if (!medicine || !uniqueUserId) {
      res.status(400).send("Data missing!");
      return;
    }
    const db = await dbConfig.loadDataBase();
    await db?.medicineStore.set({ uniqueUserId, ...medicine });
    res.send(RESPONSE_MESSAGE_CONST.SUCCESS);
  } catch (e) {
    console.log("## error in /storeMedicine: ", e);
    res.status(500).send("Error in storing medicine!");
  }
});

export { medicineRouter };
