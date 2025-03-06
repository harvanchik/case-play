import { x as xata } from "../../../chunks/xata.js";
const actions = {
  // post a new case play to the case_play table
  upload: async ({ request }) => {
    const formData = await request.formData();
    await xata.db.case_play.create({
      title: formData.get("title")?.toString() || "Unknown Title",
      prompt: formData.get("prompt")?.toString() || "Unknown Prompt",
      answer: formData.get("answer")?.toString() || "Unknown Answer",
      author: { id: "1k3fa4" },
      rulebook: { id: "v6G8ga" },
      edition: "21st",
      difficulty: parseInt(formData.get("difficulty")?.toString() || "1"),
      sport: { id: "t4y6h8" },
      film: formData.get("film")?.toString()
    });
  }
};
export {
  actions
};
