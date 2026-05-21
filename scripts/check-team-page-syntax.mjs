import fs from "fs";
import * as esbuild from "esbuild";

const p = "src/pages/teams/TeamPage.tsx";
const src = fs.readFileSync(p, "utf8");
try {
  await esbuild.transform(src, { loader: "tsx" });
  console.log("parse OK");
} catch (e) {
  console.error(String(e.message || e).slice(0, 800));
}
