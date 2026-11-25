const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { EventEmitter } = require("node:events");

test(
  "live saves validate capability, library and expected annotation",
  { skip: process.platform !== "win32" },
  async () => {
    const original = Module._load;
    const messages = [];
    let capability = true,
      root = "library-a",
      refused = false;
    Module._load = function (name, ...args) {
      if (name === "net")
        return {
          createConnection() {
            const socket = new EventEmitter();
            socket.setEncoding = socket.setTimeout = socket.destroy = () => {};
            socket.write = (text) => {
              const msg = JSON.parse(text);
              messages.push(msg);
              const response =
                msg.accion === "hola"
                  ? {
                      ok: true,
                      raiz: root,
                      capacidades: capability ? ["nota_externa"] : [],
                    }
                  : refused
                    ? { ok: false, error: "conflict" }
                    : { ok: true };
              queueMicrotask(() =>
                socket.emit("data", JSON.stringify(response) + "\n"),
              );
            };
            queueMicrotask(() => socket.emit("connect"));
            return socket;
          },
        };
      if (name === "fs/promises") return { realpath: async (value) => value };
      return original.call(this, name, ...args);
    };
    try {
      delete require.cache[require.resolve("../src/live")];
      const { saveNote, showItem } = require("../src/live");
      await saveNote(
        "library-a",
        "lib",
        { id: "item", note: "before" },
        "after",
      );
      assert.deepEqual(messages[1], {
        accion: "nota_externa",
        biblioteca: "lib",
        id: "item",
        anterior: "before",
        texto: "after",
      });
      root = "library-b";
      await assert.rejects(
        saveNote("library-a", "lib", { id: "item" }, "after"),
        /outra biblioteca/,
      );
      await assert.rejects(showItem("library-a", "item"), /outra biblioteca/);
      assert.equal(
        messages.filter((x) => x.accion === "nota_externa").length,
        1,
      );
      root = "library-a";
      capability = false;
      await assert.rejects(
        saveNote("library-a", "lib", { id: "item" }, "after"),
        /edição conectada/,
      );
      capability = true;
      refused = true;
      await assert.rejects(
        saveNote("library-a", "lib", { id: "item" }, "after"),
        /conflict/,
      );
    } finally {
      Module._load = original;
      delete require.cache[require.resolve("../src/live")];
    }
  },
);
