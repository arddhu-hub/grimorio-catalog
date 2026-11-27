# Grimorio Catalog

> **Descontinuado — substituído pelo [Folio](https://github.com/arddhu-hub/folio).**
>
> O Grimorio Catalog não receberá novas atualizações. O Folio oferece biblioteca local de imagens, importação, tags e anotações diretamente no Obsidian, sem exigir o Grimorio aberto. Este repositório e suas releases permanecem disponíveis para consulta. Preserve a biblioteca Grimorio, os documentos `.grimorio` e o `data.json` do plugin antes de migrar; não basta trocar a extensão. Veja as [orientações de migração](https://github.com/arddhu-hub/folio/blob/main/MIGRATION.md). A descontinuação se refere a este plugin de integração, não ao projeto Grimorio original.

Uma biblioteca visual dentro do Obsidian, sem uma nota Markdown para cada imagem.
Crie um documento em **Novo grimório**, pela faixa lateral, paleta de comandos ou
menu de uma pasta. Conecte a pasta da biblioteca Grimorio. Cada documento guarda
sua própria conexão, com busca em nomes, tags, anotações e notas relacionadas.
É possível ocultar nomes, tags e descrições, abrir a origem e o arquivo original,
vincular notas existentes e editar anotações abaixo da imagem.

O controle **Tamanho das miniaturas** ajusta a galeria de 120 a 360 pixels, em
tempo real. O tamanho fica salvo em cada documento `.grimorio`; imagens maiores
ocupam menos colunas, e a rolagem permanece disponível.

## Instalação e compatibilidade

Copie `main.js`, `manifest.json` e `styles.css` de uma release para
`<cofre>/.obsidian/plugins/grimorio-catalog/` e ative nos plugins da comunidade.
Requer Obsidian desktop 1.15.1 ou superior. Plataforma suportada inicialmente:
Windows; outras plataformas não foram testadas. Não disponível para celular.
O plugin ainda não foi aceito no catálogo oficial.

A leitura usa bibliotecas de schema 1 e funciona com o Grimorio fechado.
**Para salvar anotações, é necessária a extensão que fizemos no Grimorio**, com
ele aberto na mesma biblioteca. O aplicativo original não oferece esse protocolo.
O código e as instruções estão em [companion/README.md](companion/README.md).
O plugin não instala nem baixa essa extensão. As gravações passam pelo Grimorio,
com verificação de conflito; não alteram os JSONs da biblioteca diretamente.
Tags e importações continuam no aplicativo. A captura do Pinterest depende do
fluxo de importação do próprio Grimorio; este plugin não importa do Pinterest.

## Dados locais e créditos

Lê arquivos fora do cofre: a biblioteca escolhida e as imagens referenciadas por
ela. O documento guarda o caminho local; rascunhos e vínculos ficam em `data.json`.
Esses dados podem acompanhar a sincronização do cofre. Não há telemetria,
serviço de IA, conta paga ou serviço remoto necessário. Abrir a origem acessa a
URL no navegador; abrir o arquivo usa o aplicativo associado. A gravação usa
comunicação local do Windows com o Grimorio. A galeria exibe 60 itens por página
e relê os metadados a cada 15 segundos; bibliotecas grandes podem exigir mais tempo.

## Acessos apontados na revisão

- O nome de usuário do Windows (`process.env.USERNAME`) serve apenas para montar
  o endereço da conexão local já usado pelo Grimorio. Não é usado para rastreamento
  nem enviado a servidores; não coletamos hostname ou interfaces de rede.
- O acesso direto ao sistema de arquivos lê metadados e imagens da biblioteca
  escolhida, inclusive originais referenciados, e confere os caminhos da conexão.
  Não escreve diretamente nos JSONs da biblioteca. As anotações passam pelo
  Grimorio; documentos e configurações do cofre usam as APIs do Obsidian.
- “Copiar referência” escreve identificação, nome, anotação e URL de origem do
  item escolhido na área de transferência. O plugin não lê seu conteúdo nem
  copia referências automaticamente.

Esses acessos necessários podem continuar aparecendo como avisos na revisão.

Autoria e manutenção: **Arddhu**. **Toda a codificação própria foi feita pelo
OpenAI Codex, sob direção de Arddhu.** Grimorio é de Frederick Andrade Pérez
(Dohkku). [Créditos completos](ATTRIBUTION.md). Plugin sob MIT; patch do Grimorio
sob AGPL, separadamente. Contribuições e forks são bem-vindos.
