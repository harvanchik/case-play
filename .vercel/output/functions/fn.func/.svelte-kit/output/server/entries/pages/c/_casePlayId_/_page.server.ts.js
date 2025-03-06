import { x as xata } from "../../../../chunks/xata.js";
const load = async (url) => {
  const id = url.params.casePlayId;
  const casePlay = await xata.db["case_play"].select(["*", "author.*", "rulebook.*"]).filter({ id }).getFirst();
  console.log(casePlay);
  return { casePlay };
};
export {
  load
};
