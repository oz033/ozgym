import fs from "fs";
const path = "src/components/PrepAssign.jsx";
const lines = fs.readFileSync(path, "utf8").split("\n");
const out = [];
for (let i = 0; i < lines.length; i++) {
  out.push(lines[i]);
  if (
    lines[i].includes("ig-icon-btn ghost sm") &&
    !lines[i].includes("aria-label")
  ) {
    const win = lines.slice(i, i + 14).join("\n");
    if (win.includes("aria-label")) continue;
    let label = "Anpassen";
    if (win.includes("seconds") && (win.includes("- 60") || win.includes("-60")))
      label = "Eine Minute weniger";
    else if (
      win.includes("seconds") &&
      (win.includes("+ 60") || win.includes("+60"))
    )
      label = "Eine Minute mehr";
    else if (win.includes("seconds") && (win.includes("- 5") || win.includes("-5")))
      label = "5 Sekunden weniger";
    else if (win.includes("seconds") && (win.includes("+ 5") || win.includes("+5")))
      label = "5 Sekunden mehr";
    else if (win.includes("reps") && (win.includes("- 1") || win.includes("-1")))
      label = "Eine Wiederholung weniger";
    else if (win.includes("reps") && (win.includes("+ 1") || win.includes("+1")))
      label = "Eine Wiederholung mehr";
    const indent = (lines[i].match(/^\s*/) || [""])[0];
    out.push(`${indent}aria-label="${label}"`);
  }
}
fs.writeFileSync(path, out.join("\n"));
console.log("patched PrepAssign aria-labels");
