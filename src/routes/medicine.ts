import { RESPONSE_MESSAGE_CONST } from "./../consts";
import express from "express";
import { ExtendedRequest, MedicineObject } from "../types";
import { v4 as uuid } from "uuid";
import { dbConfig } from "../utils/db";

const medicineRouter = express.Router();

medicineRouter.get("/", (req, res) => {
  res.send("Medicine route's operational!");
});

medicineRouter.get("/all", async (req, res) => {
  try {
    const { uniqueUserId } = (req as ExtendedRequest).userData;
    const db = await dbConfig.loadDataBase();
    const medicines = await db?.medicineStore.get({ uniqueUserId }) || [];
    res.json(medicines);
  } catch (e) {
    console.log("## error in /medicine/all ", e);
    res.status(500).send("Error in fetching medicine!");
  }
});

medicineRouter.post("/store", async (req, res) => {
  try {
    const { uniqueUserId } = (req as ExtendedRequest).userData;
    const { ...medicine } = req.body as MedicineObject;
    if (!medicine || !uniqueUserId) {
      res.status(400).send("Data missing!");
      return;
    }
    const db = await dbConfig.loadDataBase();
    medicine.medicineId = uuid();
    await db?.medicineStore.set({ ...medicine, uniqueUserId });
    res.send(RESPONSE_MESSAGE_CONST.SUCCESS);
  } catch (e) {
    console.log("## error in /storeMedicine: ", e);
    res.status(500).send("Error in storing medicine!");
  }
});

medicineRouter.delete("/:medicineId", async (req, res) => {
  try {
    const { uniqueUserId } = (req as unknown as ExtendedRequest).userData;
    const { medicineId } = req.params as { medicineId: string };
    if (!medicineId || !uniqueUserId) {
      return res.status(400).json("Invalid payload!");
    }
    console.log(">> ", req.params);
    const db = await dbConfig.loadDataBase();
    await db?.medicineStore.del({ medicineId, uniqueUserId });
    res.json(RESPONSE_MESSAGE_CONST.SUCCESS);
  } catch (e) {
    console.log("## error in /delete medicine: ", e);
    res.status(500).send("Error in deleting medicine!");
  }
});

export { medicineRouter };
