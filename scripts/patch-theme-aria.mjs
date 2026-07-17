import fs from "fs";
const path = "src/components/ThemeStudio.jsx";
let s = fs.readFileSync(path, "utf8");
// Ensure type=button and aria-label on accent swatches
s = s.replace(
  /className=\{\s*"ig-ts-swatch([^"]*)"\s*\+\s*\(([^)]+)\)\s*\?\s*" active"\s*:\s*""\s*\}\s*\n(\s*)onClick=/g,
  (m, a, cond, ind) =>
    `className={"ig-ts-swatch${a}" + (${cond}) ? " active" : ""}\n${ind}type="button"\n${ind}aria-pressed={${cond}}\n${ind}onClick=`,
);
fs.writeFileSync(path, s);
console.log("theme studio swatches patched");
