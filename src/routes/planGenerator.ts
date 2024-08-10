import express from "express";
import { dbConfig } from "../utils/db";
import AIManager from "../AIManager"; 
import { ExtendedRequest } from "../types";

const planGeneratorRouter = express.Router();

enum PlanType {
  MEAL = "meal",
  WORKOUT = "workout",
}

const buildPlanPrompt = (
  contextResponse: string,
  planType: PlanType
): string => {
  const planDescription =
    planType === PlanType.MEAL ? "healthy and balanced" : "beginner friendly";
  const basePrompt = `Generate a ${planType} plan for the user. Make it ${planDescription}.`;

  const contextPrompt = contextResponse
    ? `Take this as a reference for gaining insights into user's health: "${contextResponse}". And generate a plan for a week.`
    : "Generate a generalized plan for a week.";

  return `${basePrompt} ${contextPrompt}`;
};

const getPlanAndStoreOnDB = async (
  id: string,
  planType: PlanType,
  improvementPrompt?: string
): Promise<{ response: string; isGeneralisedPlan: boolean }> => {
  const db = await dbConfig.loadDataBase();
  const storedPlan = await db?.plans.get({ uniqueUserId: id, planType }) as { mainPlan: string };
  let aiResponse = "", isGeneralisedPlan = false;
  if (improvementPrompt && storedPlan && storedPlan.mainPlan) {
    console.log("EDITING PLAN -> ", planType);
    const prompt = `Edit this plan ${storedPlan.mainPlan}, as per this prompt -> ${improvementPrompt}.(return the original plan, if the prompt is not health related)`;
    aiResponse = await AIManager.getResponseFromGemini(prompt);
    await db?.plans.findAndReplace({
      planType,
      uniqueUserId: id,
    }, {
      planType,
      mainPlan: aiResponse,
      uniqueUserId: id
    });
  } else {
    console.log('Generating Plan -> ', planType);
    if (storedPlan && storedPlan.mainPlan) {
      console.log("Returning pre-generated plan!");
      return { response: storedPlan.mainPlan, isGeneralisedPlan: false };
    }
    const contextResponse = await db?.context.get({ uniqueUserId: id });  
    isGeneralisedPlan = !contextResponse;
    const prompt = buildPlanPrompt(contextResponse?.contextData || "", planType);
    console.log(`## prompt for generating ${planType} plan: `, prompt);
    aiResponse = await AIManager.getResponseFromGemini(prompt);
    await db?.plans.set({
      planType,
      mainPlan: aiResponse,
      uniqueUserId: id,
    });
  }

  return { response: aiResponse, isGeneralisedPlan };
};

const handlePlanRequest =
  (planType: PlanType) =>
  async (req: express.Request, res: express.Response) => {
    try {
      const { uniqueUserId } = (req as ExtendedRequest).userData;
      const { response, isGeneralisedPlan } = await getPlanAndStoreOnDB(
        uniqueUserId,
        planType
      );
      res.json({ planDetails: response, isGeneralisedPlan });
    } catch (e) {
      console.error(`## error in /${planType}: `, e);
      res.status(500).send(`Error in fetching ${planType} plan!`);
    }
  };

planGeneratorRouter.get("/", (req, res) => {
  res.send("Plan Generator route is operational!");
});

planGeneratorRouter.get("/meal", handlePlanRequest(PlanType.MEAL));

planGeneratorRouter.get("/workout", handlePlanRequest(PlanType.WORKOUT));

planGeneratorRouter.post("/regenerate", async (req, res) => {
  try {
    const { uniqueUserId } = (req as ExtendedRequest).userData;
    const { planType, improvementPrompt } = req.body;
    if (!planType || !improvementPrompt) {
      return res.status(400).send("Invalid payload!");
    }
    if (planType !== PlanType.MEAL && planType !== PlanType.WORKOUT) {
      return res.status(400).send("Invalid plan type!");
    }
    const { response, isGeneralisedPlan } = await getPlanAndStoreOnDB(uniqueUserId, planType, improvementPrompt);
    res.json({ planDetails: response, isGeneralisedPlan });
  } catch (e) {
    console.error("Error in /regenerate: ", e);
    res.status(500).send("Error in regenerating plan!");
  }
});

export { planGeneratorRouter };
