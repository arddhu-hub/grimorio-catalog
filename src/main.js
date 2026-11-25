const {
  addIcon,
  Plugin,
  TextFileView,
  PluginSettingTab,
  Setting,
  Notice,
  Modal,
} = require("obsidian");
const { scanLibrary, filterItems } = require("./catalog");
const { saveNote, showItem } = require("./live");
const TYPE = "grimorio-catalog";
const ICON = "arddhu-grimoire";
const ICON_SVG = require("./icon");
const defaults = { libraryPath: "", links: {}, drafts: {}, safeMode: true };
function button(parent, text, action) {
  const b = parent.createEl("button", { text });
  b.onclick = action;
  return b;
}
class CatalogView extends TextFileView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = "";
    this.tag = "";
    this.page = 0;
    this.generation = 0;
    this.urls = new Set();
  }
  getViewType() {
    return TYPE;
  }
  getDisplayText() {
    return this.file?.basename || "Grimório";
  }
  getIcon() {
    return ICON;
  }
  getViewData() {
    return JSON.stringify(
      this.document || { schema: 1, type: "grimorio-catalog", libraryPath: "" },
      null,
      2,
    );
  }
  setViewData(text) {
    try {
      const doc = JSON.parse(text || "{}");
      if (doc.type !== "grimorio-catalog" || doc.schema !== 1)
        throw new Error("Documento incompatível");
      this.document = doc;
      this.selected = null;
      this.data = null;
      this.signature = null;
      if (this.status) {
        this.applyVisibility();
        this.detail.empty();
        this.list.empty();
        this.reload();
      }
    } catch (e) {
      if (this.status)
        this.status.setText("Não foi possível abrir o documento: " + e.message);
    }
  }
  clear() {
    this.document = { schema: 1, type: "grimorio-catalog", libraryPath: "" };
    this.selected = null;
    this.data = null;
    this.signature = null;
  }
  get libraryPath() {
    return this.document?.libraryPath || "";
  }
  connectLibrary() {
    if (this.noteDirty) {
      new Notice("Salve ou cancele a edição antes de trocar a biblioteca.");
      return;
    }
    new LibraryModal(this.app, this.plugin, async (path) => {
      this.document = {
        ...this.document,
        schema: 1,
        type: "grimorio-catalog",
        libraryPath: path,
      };
      this.requestSave();
      this.signature = null;
      this.selected = null;
      this.detail.empty();
      await this.reload();
    }).open();
  }
  async onOpen() {
    this.build();
    await this.reload();
    this.registerInterval(window.setInterval(() => this.reload(true), 15000));
  }
  async onClose() {
    this.generation++;
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
  }
  async loadImage(img, file) {
    try {
      const bytes = await require("fs/promises").readFile(file);
      if (!img.isConnected) return;
      const url = URL.createObjectURL(new Blob([bytes]));
      this.urls.add(url);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        this.urls.delete(url);
      };
    } catch {
      img.alt = "Imagem indisponível";
    }
  }
  build() {
    const el = this.contentEl;
    el.empty();
    el.addClass("grimorio-catalog");
    const bar = el.createDiv({ cls: "grim-toolbar" });
    bar.createEl("h2", { text: "Referências" });
    this.search = bar.createEl("input", {
      type: "search",
      placeholder: "Buscar nas notas, tags, nomes e vínculos…",
    });
    this.search.value = this.query;
    this.search.oninput = () => {
      this.query = this.search.value;
      this.page = 0;
      this.render();
    };
    this.tags = bar.createEl("select");
    this.tags.setAttribute("aria-label", "Filtrar por tag");
    this.tags.onchange = () => {
      this.tag = this.tags.value;
      this.page = 0;
      this.render();
    };
    button(bar, "Atualizar", () => this.reload());
    button(bar, "Biblioteca…", () => this.connectLibrary());
    const display = el.createDiv({ cls: "grim-display-controls" });
    display.createSpan({ text: "Exibir:" });
    this.visibilityButtons = {};
    for (const [key, label] of [
      ["name", "Nome do arquivo"],
      ["tags", "Tags"],
      ["description", "Descrição"],
    ]) {
      const toggle = button(display, label, () => {
        this.document.display = { ...this.display, [key]: !this.display[key] };
        this.applyVisibility();
        this.requestSave();
      });
      toggle.title = "Exibir ou ocultar " + label.toLowerCase();
      this.visibilityButtons[key] = toggle;
    }
    this.applyVisibility();
    this.status = el.createDiv({ cls: "grim-status" });
    const body = el.createDiv({ cls: "grim-body" });
    this.list = body.createDiv({ cls: "grim-gallery" });
    this.detail = body.createDiv({ cls: "grim-detail" });
    this.pager = el.createDiv({ cls: "grim-pager" });
  }
  get display() {
    return {
      name: true,
      tags: true,
      description: true,
      ...this.document?.display,
    };
  }
  applyVisibility() {
    for (const [key, value] of Object.entries(this.display)) {
      if (!["name", "tags", "description"].includes(key)) continue;
      this.contentEl.classList.toggle("grim-hide-" + key, !value);
      const toggle = this.visibilityButtons?.[key];
      if (toggle) {
        toggle.setAttribute("aria-pressed", String(value));
        toggle.classList.toggle("is-active", value);
      }
    }
  }
  async reload(quiet = false) {
    if (this.noteDirty) return;
    if (this.loading) return;
    this.loading = true;
    try {
      if (!this.libraryPath) {
        this.status.setText(
          "Este documento ainda não está conectado a uma biblioteca.",
        );
        this.list.empty();
        button(this.list, "Conectar biblioteca Grimorio", () =>
          this.connectLibrary(),
        );
        return;
      }
      const data = await scanLibrary(this.libraryPath);
      const signature = JSON.stringify([
        data.items,
        data.errors,
        this.plugin.data.links,
        this.plugin.data.safeMode,
      ]);
      if (quiet && signature === this.signature) return;
      this.signature = signature;
      this.data = data;
      this.tags.empty();
      this.tags.createEl("option", { value: "", text: "Todas as tags" });
      for (const tag of [...new Set(data.items.flatMap((i) => i.tags))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ))
        this.tags.createEl("option", { value: tag, text: tag });
      if (!data.items.some((i) => i.tags.includes(this.tag))) this.tag = "";
      this.tags.value = this.tag;
      this.render();
      if (this.selected && !this.noteDirty) {
        const current = data.items.find((i) => i.id === this.selected);
        if (current) await this.show(current);
        else {
          this.selected = null;
          this.detail.empty();
        }
      }
    } catch (e) {
      this.status.setText("Não foi possível ler a biblioteca: " + e.message);
    } finally {
      this.loading = false;
    }
  }
  render() {
    if (!this.data) return;
    const items = filterItems(
      this.data.items,
      this.query,
      this.tag,
      this.plugin.data.links,
      this.data.library.id,
    );
    this.status.setText(
      `${this.data.library.name} · ${items.length} de ${this.data.items.length} referências${this.data.errors.length ? " · " + this.data.errors.length + " registros não puderam ser lidos" : ""}`,
    );
    this.list.empty();
    this.pager.empty();
    this.page = Math.min(
      this.page,
      Math.max(0, Math.ceil(items.length / 60) - 1),
    );
    for (const item of items.slice(this.page * 60, this.page * 60 + 60)) {
      const card = this.list.createEl("button", { cls: "grim-card" });
      card.onclick = () => this.show(item);
      const hidden = item.adult && this.plugin.data.safeMode;
      if (!hidden && /^(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(item.ext)) {
        const img = card.createEl("img");
        img.loading = "lazy";
        this.loadImage(img, item.file);
        img.alt = item.name;
        img.onerror = () => {
          img.remove();
          card.createDiv({ text: "Imagem indisponível" });
        };
      } else
        card.createDiv({
          cls: "grim-placeholder",
          text: hidden ? "Conteúdo oculto" : item.ext.toUpperCase(),
        });
      card.createDiv({ cls: "grim-title grim-name", text: item.name });
      card.createDiv({
        cls: "grim-tags grim-item-tags",
        text: item.tags.join(" · "),
      });
      if (!hidden && item.note)
        card.createDiv({
          cls: "grim-card-description grim-description",
          text: item.note,
        });
    }
    if (!items.length)
      this.list.createEl("p", { text: "Nenhuma referência encontrada." });
    if (items.length > 60) {
      button(this.pager, "Anterior", () => {
        this.page--;
        this.render();
      }).disabled = this.page === 0;
      this.pager.createSpan({
        text: `Página ${this.page + 1} de ${Math.ceil(items.length / 60)}`,
      });
      button(this.pager, "Próxima", () => {
        this.page++;
        this.render();
      }).disabled = (this.page + 1) * 60 >= items.length;
    }
  }
  async show(item) {
    if (this.noteDirty) {
      new Notice("Salve ou cancele a edição antes de trocar de imagem.");
      return;
    }
    const gen = ++this.generation;
    this.selected = item.id;
    const el = this.detail;
    el.empty();
    this.detail.parentElement.scrollTop = 0;
    el.scrollTop = 0;
    button(el, "Voltar à galeria", () => {
      if (this.noteDirty) {
        new Notice("Salve ou cancele a edição primeiro.");
        return;
      }
      this.selected = null;
      el.empty();
    });
    el.createEl("h3", { cls: "grim-name", text: item.name });
    if (item.adult && this.plugin.data.safeMode) {
      el.createEl("p", { text: "Conteúdo oculto pelo modo seguro." });
      return;
    }
    if (/^(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(item.ext)) {
      const img = el.createEl("img", { cls: "grim-preview" });
      this.loadImage(img, item.file);
      img.alt = item.name;
    }
    el.createDiv({
      cls: "grim-tags grim-item-tags",
      text: item.tags.join(" · "),
    });
    el.createDiv({ text: "★".repeat(item.stars || 0) });
    const note = el.createDiv({ cls: "grim-note grim-description" });
    note.createEl("h4", { text: "Anotação" });
    const draftKey = this.data.library.id + ":" + item.id,
      draft = this.plugin.data.drafts[draftKey];
    const expected = draft ? draft.original : item.note;
    const editor = note.createEl("textarea", {
      cls: "grim-note-editor",
      placeholder: "Escreva uma anotação sobre esta imagem…",
    });
    editor.setAttribute("aria-label", "Anotação da imagem");
    editor.value = draft?.text ?? item.note;
    const inlineLinks = note.createDiv({ cls: "grim-note-links" });
    for (const match of editor.value.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      const [target, label] = match[1].split("|");
      const a = inlineLinks.createEl("a", {
        text: label || target,
        cls: "internal-link",
      });
      a.onclick = () => this.app.workspace.openLinkText(target, "", true);
    }
    const actions = el.createDiv({ cls: "grim-actions" }),
      editActions = actions.createDiv({ cls: "grim-edit-actions" });
    const feedback = actions.createEl("p", { cls: "grim-save-feedback" });
    feedback.setAttribute("aria-live", "polite");
    this.noteDirty = !!draft;
    const save = button(editActions, "Salvar anotação", async () => {
      if (!this.noteDirty) return;
      save.disabled = true;
      cancel.disabled = true;
      editor.disabled = true;
      feedback.setText("Salvando no Grimorio…");
      try {
        await saveNote(
          this.libraryPath,
          this.data.library.id,
          { ...item, note: expected },
          editor.value,
        );
        delete this.plugin.data.drafts[draftKey];
        await this.plugin.save();
        this.noteDirty = false;
        new Notice("Anotação salva no Grimorio.");
        await this.reload();
      } catch (e) {
        feedback.setText(e.message);
        new Notice(e.message);
      } finally {
        editor.disabled = false;
        save.disabled = !this.noteDirty;
        cancel.disabled = !this.noteDirty;
      }
    });
    save.classList.add("mod-cta");
    const cancel = button(editActions, "Descartar alterações", async () => {
      delete this.plugin.data.drafts[draftKey];
      await this.plugin.save();
      this.noteDirty = false;
      await this.reload();
    });
    save.disabled = cancel.disabled = !this.noteDirty;
    editor.oninput = () => {
      this.noteDirty = editor.value !== item.note;
      save.disabled = cancel.disabled = !this.noteDirty;
      if (this.noteDirty)
        this.plugin.data.drafts[draftKey] = {
          original: expected,
          text: editor.value,
        };
      else delete this.plugin.data.drafts[draftKey];
      feedback.setText(this.noteDirty ? "Alterações ainda não salvas." : "");
      this.plugin.save();
    };
    const fileActions = actions.createDiv({ cls: "grim-file-actions" });
    const source = button(fileActions, "Abrir origem", () =>
      require("electron").shell.openExternal(item.source),
    );
    source.disabled = !/^https?:\/\//i.test(item.source);
    button(fileActions, "Abrir arquivo", async () => {
      const error = await require("electron").shell.openPath(item.file);
      if (error) new Notice(error);
    });
    button(fileActions, "Mostrar no Grimorio", () =>
      this.plugin.showInGrimorio(this.libraryPath, item.id),
    );
    button(fileActions, "Copiar referência", () => {
      navigator.clipboard.writeText(
        `grimorio://${this.data.library.id}/${item.id}\n${item.name}\n${editor.value}\n${item.source}`,
      );
      new Notice("Referência copiada.");
    });
    el.createEl("h4", { text: "Notas relacionadas no Obsidian" });
    const key = `${this.data.library.id}:${item.id}`;
    const links = el.createDiv();
    for (const target of this.plugin.data.links[key] || []) {
      const row = links.createDiv();
      const a = row.createEl("a", { text: target, cls: "internal-link" });
      a.onclick = () => this.app.workspace.openLinkText(target, "", true);
      button(row, "×", async () => {
        this.plugin.data.links[key] = this.plugin.data.links[key].filter(
          (x) => x !== target,
        );
        await this.plugin.save();
        if (gen === this.generation) this.show(item);
      });
    }
    const input = el.createEl("input", {
      placeholder: "Nome ou caminho de uma nota existente",
    });
    button(el, "Vincular nota", async () => {
      const target = input.value.trim().replace(/^\[\[|\]\]$/g, "");
      if (!target) return;
      const file = this.app.metadataCache.getFirstLinkpathDest(target, "");
      if (!file) {
        new Notice("Nota não encontrada no vault.");
        return;
      }
      const list = this.plugin.data.links[key] || [];
      this.plugin.data.links[key] = [
        ...new Set([...list, file.path.replace(/\.md$/, "")]),
      ];
      await this.plugin.save();
      this.show(item);
    });
    el.createEl("p", {
      cls: "grim-help",
      text: "Anotações são salvas pela conexão com o Grimorio aberto. Tags continuam no Grimorio. Os vínculos ficam no Obsidian.",
    });
  }
}
class LibraryModal extends Modal {
  constructor(app, plugin, onChoose) {
    super(app);
    this.plugin = plugin;
    this.onChoose = onChoose;
  }
  onOpen() {
    this.contentEl.createEl("h3", { text: "Conectar biblioteca Grimorio" });
    const input = this.contentEl.createEl("input", { type: "text" });
    input.style.width = "100%";
    input.value = this.plugin.data.libraryPath || "";
    button(this.contentEl, "Conectar", async () => {
      try {
        await scanLibrary(input.value);
        if (this.onChoose) await this.onChoose(input.value);
        else {
          this.plugin.data.libraryPath = input.value;
          await this.plugin.save();
        }
        this.close();
      } catch (e) {
        new Notice(e.message);
      }
    });
  }
}
class NewGrimoireModal extends Modal {
  constructor(app, plugin, folder) {
    super(app);
    this.plugin = plugin;
    this.folder = folder;
  }
  onOpen() {
    this.contentEl.createEl("h3", { text: "Novo grimório" });
    const input = this.contentEl.createEl("input", {
      type: "text",
      placeholder: "Nome do grimório",
    });
    input.value = "Referências";
    input.style.width = "100%";
    const create = async () => {
      try {
        const name = input.value.trim();
        if (!name || /[\\/:*?"<>|]/.test(name))
          throw new Error("Escolha um nome sem caracteres de caminho.");
        const parent = this.folder?.path || "";
        const base = (parent ? parent + "/" : "") + name;
        let dest = base + ".grimorio",
          n = 1;
        while (this.app.vault.getAbstractFileByPath(dest))
          dest = base + " " + n++ + ".grimorio";
        const file = await this.app.vault.create(
          dest,
          JSON.stringify(
            { schema: 1, type: "grimorio-catalog", libraryPath: "" },
            null,
            2,
          ),
        );
        this.close();
        await this.app.workspace.getLeaf("tab").openFile(file);
      } catch (e) {
        new Notice(e.message);
      }
    };
    button(this.contentEl, "Criar grimório", create);
    input.onkeydown = (e) => {
      if (e.key === "Enter") create();
    };
  }
}
class Settings extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Biblioteca local")
      .setDesc(this.plugin.data.libraryPath || "Não configurada")
      .addButton((b) =>
        b.setButtonText("Escolher").onClick(() => this.plugin.chooseLibrary()),
      );
    new Setting(this.containerEl)
      .setName("Modo seguro")
      .setDesc("Oculta imagens marcadas como adultas.")
      .addToggle((t) =>
        t.setValue(this.plugin.data.safeMode).onChange(async (value) => {
          this.plugin.data.safeMode = value;
          await this.plugin.save();
          await this.plugin.refresh();
        }),
      );
  }
}
module.exports = class CatalogPlugin extends Plugin {
  async onload() {
    addIcon(ICON, ICON_SVG);
    const stored = await this.loadData();
    this.data = {
      ...defaults,
      ...stored,
      links: { ...stored?.links },
      drafts: { ...stored?.drafts },
    };
    this.registerView(TYPE, (leaf) => new CatalogView(leaf, this));
    this.registerExtensions(["grimorio"], TYPE);
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file.children)
          menu.addItem((item) =>
            item
              .setTitle("Novo grimório")
              .setIcon(ICON)
              .onClick(() => this.newDocument(file)),
          );
      }),
    );
    this.addRibbonIcon(ICON, "Novo grimório", () => this.newDocument());
    this.addCommand({
      id: "open",
      icon: ICON,
      name: "Abrir catálogo de referências",
      callback: () => this.open(),
    });
    this.addCommand({
      id: "new-grimoire",
      icon: ICON,
      name: "Novo grimório",
      callback: () => this.newDocument(),
    });
    this.addSettingTab(new Settings(this.app, this));
    this.registerEvent(
      this.app.vault.on("rename", async (file, old) => {
        if (file.extension !== "md") return;
        for (const key of Object.keys(this.data.links))
          this.data.links[key] = this.data.links[key].map((x) =>
            x === old.replace(/\.md$/, "") ? file.path.replace(/\.md$/, "") : x,
          );
        await this.save();
        await this.refresh();
      }),
    );
  }
  async save() {
    const snapshot = JSON.parse(JSON.stringify(this.data));
    this.saveQueue = (this.saveQueue || Promise.resolve())
      .catch(() => {})
      .then(() => this.saveData(snapshot));
    return this.saveQueue;
  }
  chooseLibrary() {
    new LibraryModal(this.app, this).open();
  }
  async refresh() {
    for (const leaf of this.app.workspace.getLeavesOfType(TYPE))
      await leaf.view.reload();
  }
  newDocument(folder) {
    new NewGrimoireModal(
      this.app,
      this,
      folder || this.app.vault.getRoot(),
    ).open();
  }
  async open() {
    const leaf = this.app.workspace.getLeavesOfType(TYPE)[0];
    if (leaf) await this.app.workspace.revealLeaf(leaf);
    else this.newDocument();
  }
  async showInGrimorio(root, id) {
    try {
      await showItem(root, id);
    } catch (error) {
      new Notice(error.message);
    }
  }
};
