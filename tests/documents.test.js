const test = require("node:test"),
  assert = require("node:assert/strict"),
  Module = require("module");
test("documentos guardam conexões independentes e não usam um caminho global", async () => {
  const original = Module._load;
  let factory;
  class Plugin {
    async loadData() {
      return { libraryPath: "D:/legado.grimorio" };
    }
    registerView(type, f) {
      factory = f;
    }
    registerExtensions(ext) {
      assert.deepEqual(ext, ["grimorio"]);
    }
    registerEvent() {}
    addRibbonIcon() {}
    addCommand() {}
    addSettingTab() {}
  }
  class View {
    constructor(leaf) {
      this.leaf = leaf;
    }
  }
  Module._load = function (name, ...args) {
    if (name === "obsidian")
      return {
        addIcon() {},
        Plugin,
        TextFileView: View,
        PluginSettingTab: class {},
        Setting: class {},
        Notice: class {},
        Modal: class {},
        Component: class {},
      };
    return original.call(this, name, ...args);
  };
  try {
    const Catalog = require("../src/main");
    const plugin = new Catalog();
    plugin.app = { workspace: { on: () => {} }, vault: { on: () => {} } };
    await plugin.onload();
    const a = factory({}),
      b = factory({});
    a.setViewData(
      JSON.stringify({
        schema: 1,
        type: "grimorio-catalog",
        libraryPath: "D:/A.grimorio",
      }),
    );
    b.setViewData(
      JSON.stringify({
        schema: 1,
        type: "grimorio-catalog",
        libraryPath: "D:/B.grimorio",
      }),
    );
    assert.equal(a.libraryPath, "D:/A.grimorio");
    assert.equal(b.libraryPath, "D:/B.grimorio");
    assert.equal(JSON.parse(a.getViewData()).libraryPath, "D:/A.grimorio");
    a.clear();
    assert.equal(a.libraryPath, "");
    assert.equal(b.libraryPath, "D:/B.grimorio");
  } finally {
    Module._load = original;
  }
});
