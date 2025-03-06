import { x as xata } from "../../../chunks/xata.js";
let playlists;
let isQuerying = false;
const load = async () => {
  (await _getPlaylists()).playlists;
  return { playlists, isQuerying };
};
const _getPlaylists = async () => {
  const playlists2 = await xata.db.playlist.select(["case_plays", "title"]).getAll();
  const playlistsWithCasePlays = await xata.db.playlist.getPaginated({
    columns: ["*", "case_plays.*"]
  });
  console.log(playlistsWithCasePlays);
  console.log(playlists2);
  return { playlists: playlists2 };
};
export {
  _getPlaylists,
  load
};
