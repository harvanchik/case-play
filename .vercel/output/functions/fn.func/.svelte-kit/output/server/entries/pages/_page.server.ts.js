import { x as xata } from "../../chunks/xata.js";
const _getAll = async () => {
  const records = await xata.db.case_play.select(["title", "prompt", "answer", "edition", "difficulty", "date_created", "date_updated", "film"]).getAll();
  return { casePlays: records };
};
const load = async () => {
  const result = await _getAll();
  return result;
};
export {
  _getAll,
  load
};
