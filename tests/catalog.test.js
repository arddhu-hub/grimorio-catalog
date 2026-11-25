const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs/promises"),
  os = require("os"),
  path = require("path");
const { scanLibrary, filterItems } = require("../src/catalog");
test("biblioteca: notas, tags, ref, pilhas, lixeira e registro inválido", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "grimorio-catalog-"));
  try {
    await fs.writeFile(
      path.join(root, "library.json"),
      JSON.stringify({ schema: 1, id: "library", name: "Teste" }),
    );
    const ids = [
      "01M895D8NVZ8BSZMZJTVFGV81A",
      "01M895EDGT6WHD8AP58VRXCR5C",
      "01M895EDGT6WHD8AP58VRXCR5D",
      "01M895EDGT6WHD8AP58VRXCR5E",
    ];
    for (let n = 0; n < 4; n++) {
      const dir = path.join(root, "items", String(n));
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, "item.json"),
        JSON.stringify({
          schema: 1,
          id: ids[n],
          ext: "jpg",
          name: "Traje",
          note: "Paladino de Walmeria",
          tags: ["armadura"],
          ...(n === 1 ? { pila: ids[0] } : {}),
          ...(n === 2 ? { trashed: true } : {}),
          ...(n === 3
            ? { origin: { mode: "ref", path: "D:/imagem.jpg" } }
            : {}),
        }),
      );
    }
    await fs.mkdir(path.join(root, "items", "bad"));
    await fs.writeFile(path.join(root, "items", "bad", "item.json"), "{");
    const result = await scanLibrary(root);
    assert.equal(result.items.length, 2);
    assert.equal(result.errors.length, 1);
    assert.equal(
      filterItems(result.items, "PALADÍNO walmeria", "armadura").length,
      2,
    );
    assert.equal(
      filterItems(
        result.items,
        "cidade y",
        "",
        { ["library:" + ids[0]]: ["Cidade Y"] },
        "library",
      ).length,
      1,
    );
    assert.equal(
      result.items.find((i) => i.id === ids[3]).file,
      "D:/imagem.jpg",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
