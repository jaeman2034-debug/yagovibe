import fs from "fs";
import path from "path";

/** Modal/dialog shells: keep max-w-md on all breakpoints */
const MODAL_SHELL = "w-full max-w-md";

const modalPathHints = [
  "Modal",
  "Dialog",
  "Drawer",
  "Paywall",
  "NotiPanel",
  "ProductComments",
  "FabWrite",
  "CreateModal",
  "LazySignup",
  "CoachReport",
  "FirstAction",
  "PlayComingSoon",
  "PlayFeedback",
  "PlaySimulation",
  "FeePayment",
  "FederationExpense",
  "FederationIncome",
  "CompetitionFee",
  "PaymentConfirmation",
  "PaymentFailure",
  "PaymentSuccess",
  "ReviewModal",
  "DraftRestore",
  "BottomActionSheet",
  "AssistantPanel",
  "AddPlayerModal",
  "NoticeDelete",
  "TeamPaywall",
];

const wrong = "w-full max-w-none md:max-w-3xl";

function shouldRevert(file) {
  const base = path.basename(file);
  return modalPathHints.some((h) => file.includes(h) || base.includes(h));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

let n = 0;
for (const file of walk(path.join(process.cwd(), "src"))) {
  if (!shouldRevert(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(wrong)) continue;
  const orig = src;
  // Restore modal width cap; preserve trailing classes after wrong token
  src = src.replace(
    new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\"`]*)", "g"),
    (_, rest) => `${MODAL_SHELL}${rest}`
  );
  if (src !== orig) {
    fs.writeFileSync(file, src);
    n++;
    console.log("reverted", path.relative(process.cwd(), file));
  }
}
console.log("reverted total", n);
