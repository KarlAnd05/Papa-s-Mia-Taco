import { Router } from "express";
import { requireStaff } from "../lib/auth";
import { parse } from "../lib/http";
import { getSettings, saveSettings, settingsUpdateSchema } from "../lib/settings";

const router = Router();

// Used by the public site (ordering/reservation rules, receipt header). Contains nothing sensitive.
router.get("/settings/public", async (_req, res) => {
  res.json(await getSettings());
});

router.put("/settings", requireStaff, async (req, res) => {
  const update = parse(settingsUpdateSchema, req.body);
  res.json(await saveSettings(update));
});

export default router;
