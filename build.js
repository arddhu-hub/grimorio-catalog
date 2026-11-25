const fs = require("node:fs"),
  path = require("node:path");
const root = __dirname;
let main = fs.readFileSync(path.join(root, "src/main.js"), "utf8");
for (const name of ["catalog", "live", "icon"]) {
  const source = fs.readFileSync(path.join(root, `src/${name}.js`), "utf8");
  const bundled = `(() => { const module = {exports: {}};\n${source}\nreturn module.exports; })()`;
  main = main
    .replace(`require('./${name}')`, () => bundled)
    .replace(`require("./${name}")`, () => bundled);
}
const notice = fs.readFileSync(path.join(root, "LICENSE"), "utf8") + "\n" + fs.readFileSync(path.join(root, "ATTRIBUTION.md"), "utf8");
fs.writeFileSync(path.join(root, "main.js"), `/*\n${notice}\n*/\n${main}`);
fs.copyFileSync(
  path.join(root, "src/styles.css"),
  path.join(root, "styles.css"),
);
