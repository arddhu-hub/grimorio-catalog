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
    async saveData() {}
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
    // A slider change must survive a document round-trip without changing another document.
    function element() {
      const styles = {};
      return {
        children: [], parentElement: {},
        styles,
        style: { setProperty: (key, value) => { styles[key] = value; } },
        classList: { toggle() {}, remove() {}, add() {} },
        empty() { this.children = []; }, addClass() {}, setAttribute() {}, setText(value) { this.text = value; },
        createEl(tag, options = {}) {
          const child = Object.assign(element(), {tag, ...options, parentElement: this});
          this.children.push(child);
          return child;
        },
        createDiv(options) { return this.createEl("div", options); },
        createSpan(options) { return this.createEl("span", options); },
      };
    }
    a.contentEl = element();
    let saves = 0;
    a.requestSave = () => { saves++; };
    a.build();
    assert.equal(a.thumbnailSlider.value, "180");
    a.thumbnailSlider.value = "280";
    a.thumbnailSlider.oninput();
    assert.equal(saves, 1);
    assert.equal(a.contentEl.styles["--grim-thumbnail-size"], "280px");
    assert.equal(b.thumbnailSize, 180);
    const reopened = factory({});
    reopened.setViewData(a.getViewData());
    assert.equal(reopened.thumbnailSize, 280);
    for (const [value, expected] of [[null, 180], ["200", 180], [-1, 120], [99999, 360]]) {
      reopened.document.display.thumbnailSize = value;
      assert.equal(reopened.thumbnailSize, expected);
    }
    assert.equal(JSON.parse(a.getViewData()).libraryPath, "D:/A.grimorio");
    const item = {id: "sample", ext: "txt", name: "Example", note: "Original note", tags: ["reference"], source: "https://example.com"};
    a.catalogData = {library: {id: "library"}, items: [item], errors: []};
    // TextFileView owns `data` and writes serialized document text during saves.
    a.requestSave = () => { a.data = a.getViewData(); };
    a.thumbnailSlider.value = "320";
    a.thumbnailSlider.oninput();
    assert.equal(typeof a.data, "string");
    await a.show(item);
    const flatten = node => [node, ...node.children.flatMap(flatten)];
    const nodes = flatten(a.detail);
    const editor = nodes.find(node => node.tag === "textarea");
    assert.equal(editor.value, "Original note");
    assert.ok(!editor.parentElement.cls.includes("grim-description"));
    const save = nodes.find(node => node.text === "Salvar anotação");
    assert.ok(save);
    assert.ok(nodes.find(node => node.text === "Abrir origem"));
    const tags = nodes.find(node => node.text === "Editar tags no Grimorio");
    let shown;
    plugin.showInGrimorio = async (...args) => { shown = args; };
    await tags.onclick();
    assert.deepEqual(shown, ["D:/A.grimorio", "sample"]);
    editor.value = "Updated note";
    editor.oninput();
    assert.equal(save.disabled, false);
    assert.deepEqual(plugin.data.drafts["library:sample"], {original: "Original note", text: "Updated note"});
    await plugin.save();
    a.noteDirty = false;
    a.clear();
    assert.equal(a.libraryPath, "");
    assert.equal(b.libraryPath, "D:/B.grimorio");
  } finally {
    Module._load = original;
  }
});
