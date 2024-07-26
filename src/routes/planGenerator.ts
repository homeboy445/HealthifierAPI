import express from "express";
import { dbConfig } from "../utils/db";
import AIManager from "../AIManager"; 

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

const generatePlanAndStoreOnDB = async (
  id: string,
  planType: PlanType
): Promise<{ response: string; isGeneralisedPlan: boolean }> => {
  const db = await dbConfig.loadDataBase();
  console.log('getting context for user id: ', id);
  const contextResponse = await db?.context.get({ uniqueUserId: id });

  const isGeneralisedPlan = !contextResponse;
  const prompt = buildPlanPrompt(contextResponse?.contextData || "", planType);
  console.log(`## prompt for generating ${planType} plan: `, prompt);

  const aiResponse = await AIManager.getResponseFromGemini(prompt);
  await db?.plans.set({
    planType,
    mainPlan: aiResponse,
    uniqueUserId: id,
  });

  return { response: aiResponse, isGeneralisedPlan };
};

const handlePlanRequest =
  (planType: PlanType) =>
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        res.status(400).send("Unique user id is required!");
        return;
      }
      const { response, isGeneralisedPlan } = await generatePlanAndStoreOnDB(
        id,
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

planGeneratorRouter.get("/meal/:id", handlePlanRequest(PlanType.MEAL));

planGeneratorRouter.get("/workout/:id", handlePlanRequest(PlanType.WORKOUT));

export { planGeneratorRouter };
