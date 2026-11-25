const net = require("net");
function request(message, timeout = 20000) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32")
      return reject(new Error("Conexão local disponível no Windows."));
    const socket = net.createConnection(
      "\\\\.\\pipe\\grimorio-puerta-" + process.env.USERNAME,
    );
    socket.setEncoding("utf8");
    let buffer = "",
      done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    };
    socket.setTimeout(timeout);
    socket.on("connect", () => socket.write(JSON.stringify(message) + "\n"));
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (buffer.length > 2 * 1024 * 1024)
        return finish(new Error("Resposta grande demais."));
      const end = buffer.indexOf("\n");
      if (end < 0) return;
      try {
        const value = JSON.parse(buffer.slice(0, end));
        finish(
          value.ok
            ? null
            : new Error(value.error || "Operação recusada pelo Grimorio."),
          value,
        );
      } catch (e) {
        finish(e);
      }
    });
    socket.on("timeout", () =>
      finish(
        new Error(
          "Sem confirmação. Consulte a nota antes de tentar salvar novamente.",
        ),
      ),
    );
    socket.on("error", () =>
      finish(new Error("Não foi possível conectar ao Grimorio aberto.")),
    );
    socket.on("end", () => {
      if (!done) finish(new Error("Conexão encerrada sem confirmação."));
    });
  });
}
async function connected(root) {
  const info = await request({ accion: "hola" });
  if (typeof info.raiz !== "string")
    throw new Error(
      "O Grimorio conectado não informa a biblioteca. Use uma versão compatível.",
    );
  const fs = require("fs/promises");
  const a = await fs.realpath(root),
    b = await fs.realpath(info.raiz);
  if (a.toLowerCase() !== b.toLowerCase())
    throw new Error(
      "A janela conectada do Grimorio está usando outra biblioteca.",
    );
  return info;
}
async function showItem(root, id) {
  await connected(root);
  return request({ accion: "mostrar", id });
}
async function saveNote(root, libraryId, item, text) {
  const info = await connected(root);
  if (!info.capacidades?.includes("nota_externa"))
    throw new Error(
      "Esta versão do Grimorio não oferece edição conectada. Consulte o guia do patch no repositório.",
    );
  return request({
    accion: "nota_externa",
    biblioteca: libraryId,
    id: item.id,
    anterior: item.note || "",
    texto: text,
  });
}
module.exports = { request, saveNote, showItem };
