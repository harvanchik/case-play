import { buildClient } from "@xata.io/client";
const tables = [
  {
    name: "case_play",
    columns: [
      { name: "title", type: "string", notNull: true, defaultValue: "" },
      { name: "prompt", type: "text", notNull: true, defaultValue: "" },
      { name: "answer", type: "text", notNull: true, defaultValue: "" },
      { name: "author", type: "link", link: { table: "user" } },
      { name: "rulebook", type: "link", link: { table: "rulebook" } },
      { name: "edition", type: "string" },
      { name: "difficulty", type: "int", notNull: true, defaultValue: "1" },
      {
        name: "date_created",
        type: "datetime",
        notNull: true,
        defaultValue: "1970-12-23T00:00:00Z"
      },
      {
        name: "date_updated",
        type: "datetime",
        notNull: true,
        defaultValue: "1970-12-23T00:00:00Z"
      },
      { name: "sport", type: "link", link: { table: "sport" } },
      { name: "film", type: "string" }
    ]
  },
  {
    name: "user",
    columns: [
      { name: "first_name", type: "string", notNull: true, defaultValue: "" },
      { name: "last_name", type: "string", notNull: true, defaultValue: "" }
    ],
    revLinks: [{ column: "", table: "case_play" }]
  },
  {
    name: "rulebook",
    columns: [
      { name: "title", type: "string", notNull: true, defaultValue: "" },
      {
        name: "slug",
        type: "string",
        notNull: true,
        defaultValue: "nirsa-flag"
      },
      { name: "nickname", type: "text", defaultValue: "" }
    ],
    revLinks: [{ column: "", table: "case_play" }]
  },
  {
    name: "playlist",
    columns: [
      { name: "case_plays", type: "multiple" },
      { name: "title", type: "string", defaultValue: "Untitled Playlist" }
    ]
  },
  {
    name: "sport",
    columns: [
      { name: "slug", type: "string", unique: true },
      { name: "name", type: "string" }
    ],
    revLinks: [{ column: "sport", table: "case_play" }]
  }
];
const DatabaseClient = buildClient();
const defaultOptions = {
  databaseURL: "https://jh7-s-workspace-bj4527.us-west-2.xata.sh/db/case-play-db"
};
class XataClient extends DatabaseClient {
  constructor(options) {
    super({ ...defaultOptions, ...options }, tables);
  }
}
const XATA_API_KEY = "xau_UB13wuhmhAtkXP6C9JOYaZ7DR9dalF0e1";
const xata = new XataClient({ apiKey: XATA_API_KEY });
export {
  xata as x
};
