# Grimorio Catalog

[Português](README.pt-BR.md) · [Attribution](ATTRIBUTION.md)

Browse a local [Grimorio](https://github.com/Dohkku/grimorio) image library as a
document in Obsidian, without creating a Markdown note for every image.

Create a **Novo grimório** document using the ribbon, command palette or folder
context menu. Connect it to a library folder containing `library.json` and `items`.
Each `.grimorio` document keeps its own connection and display preferences.
Search filenames, tags, annotations and related-note links; filter tags, browse
paginated thumbnails, follow sources, open originals and link existing notes.
Toggle filenames, tags and annotation previews independently. Annotations are
editable directly below the image, with draft recovery and conflict detection.

## Compatibility and limits

Desktop Obsidian 1.15.1 or newer. Windows is the supported platform for this initial
release; other desktop platforms have not been tested. Library reading supports
Grimorio schema 1. Existing images and annotations can be browsed without running
Grimorio. Editing annotations and showing an image in the app require an open,
compatible Grimorio instance using the same library. **Stock Grimorio does not
provide the annotation-editing extension used here.** See [companion/README.md](companion/README.md)
for the patch, pinned source revision and build instructions. No companion is
downloaded or installed automatically. Saving never writes `item.json` directly:
Grimorio validates the previous annotation before applying its normal save flow.

Tags and image imports remain managed by Grimorio. This is not a Pinterest
importer; use Grimorio's own capture/import workflow. Large libraries are rescanned
every 15 seconds while the document is open; thumbnails are paginated in groups
of 60. The custom explorer icon may vary with themes. Mobile is unsupported.

## Install manually

Download `main.js`, `manifest.json` and `styles.css` from a release into
`<vault>/.obsidian/plugins/grimorio-catalog/`, then enable the plugin in Community
plugins. Alternatively build from source with `npm ci && npm run build`.
This project has not yet been accepted into the community directory.

## Data and access

The plugin reads files **outside the vault**, from the library folder you choose
and original image paths referenced by that library. `.grimorio` documents store
the local library path; links and unsaved annotation drafts are stored in the
plugin's local `data.json`. Those files may be included in your vault sync.
Image previews are local. No telemetry, network service, paid account or AI
service is required. Clicking a source opens its HTTP(S) URL in your browser;
opening an original launches its associated application. Windows IPC connects
only to the local Grimorio process. Annotations are sent only when you save.

### Security review disclosures

- **Windows username:** `process.env.USERNAME` is read solely to construct the
  existing Grimorio named-pipe endpoint (`grimorio-puerta-<username>`). It is not
  used for fingerprinting, analytics or remote requests. No hostname, network
  interface information or other user-profile data is collected.
- **Direct filesystem access:** Node's filesystem API reads library metadata and
  original images, including reference-mode image paths, and resolves local paths
  to verify which library is connected. It does not directly write to the library.
  Annotation changes go through the local Grimorio process; vault documents and
  plugin settings use Obsidian's APIs. The library folder is chosen by the user.
- **Clipboard:** clicking “Copiar referência” writes the selected reference
  (library/item identifier, name, annotation and source URL) to the system
  clipboard. The plugin never reads the clipboard or automatically copies data.

Automated reviews may continue to flag these APIs because the permissions are
needed for the features above. These disclosures describe the actual access;
the plugin does not conceal or bypass the review checks.

Safe mode hides items marked adult by Grimorio; it is a presentation option.

## Development and credits

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT license for the plugin; the companion
patch has separate AGPL terms. **Arddhu** directs and maintains this project.
**All custom coding was done by OpenAI Codex under Arddhu's direction.**
Third-party software remains credited to its original authors in ATTRIBUTION.md.
