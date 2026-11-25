const fs = require("fs/promises");
const path = require("path");
const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
async function scanLibrary(root) {
  root = await fs.realpath(root);
  const library = JSON.parse(
    await fs.readFile(path.join(root, "library.json"), "utf8"),
  );
  if (library.schema !== 1 || !library.id)
    throw new Error("Biblioteca Grimorio incompatível.");
  const items = [],
    errors = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === "item.json" && entry.isFile()) {
        try {
          const item = JSON.parse(await fs.readFile(full, "utf8"));
          if (
            item.schema !== 1 ||
            !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(item.id) ||
            !/^[a-z0-9]+$/i.test(item.ext)
          )
            throw new Error("Registro incompatível");
          if (item.trashed) continue;
          item.tags = Array.isArray(item.tags)
            ? item.tags.filter((t) => typeof t === "string")
            : [];
          item.name = String(item.name || item.id);
          item.note = String(item.note || "");
          item.source = String(item.source || "");
          item.file =
            item.origin?.mode === "ref"
              ? item.origin.path
              : path.join(dir, "original." + item.ext);
          item.metadata = full;
          items.push(item);
        } catch (e) {
          errors.push({ file: full, error: e.message });
        }
      }
    }
  }
  await walk(path.join(root, "items"));
  const ids = new Set(items.map((i) => i.id));
  return {
    root,
    library,
    errors,
    items: items
      .filter((i) => !i.pila || !ids.has(i.pila))
      .sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt))),
  };
}
function filterItems(items, query, tag, links = {}, libraryId = "") {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter(
    (i) =>
      (!tag || i.tags.includes(tag)) &&
      terms.every((t) =>
        normalize(
          [
            i.name,
            i.note,
            i.source,
            ...i.tags,
            ...(links[`${libraryId}:${i.id}`] || []),
          ].join(" "),
        ).includes(t),
      ),
  );
}
module.exports = { scanLibrary, filterItems, normalize };
