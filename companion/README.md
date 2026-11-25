# Optional Grimorio live-annotation patch

This directory is **not** covered by the plugin's MIT license. It contains changes
to [Grimorio](https://github.com/Dohkku/grimorio), copyright Frederick Andrade
PÃ©rez, under its AGPL-3.0 license. The full license is in LICENSE-AGPL-3.0.md.
Custom changes were coded by OpenAI Codex under Arddhu's direction. This is an
unofficial modification; no application binaries or third-party runtime are included.

Base source revision: `8da90458fe7c4a0533754bb3b1246588a3eea5b6`.
The patch adds `nota_externa`: library-identity checking, compare-and-save against
the previous annotation, normal worker persistence and a confirmed response.
The handshake reports the library root and capability. Neither closing Grimorio
nor direct JSON edits by the plugin are needed.

## Apply and build

Install prerequisites from the pinned source's `docs/WINDOWS.md` and
`docs/DEPENDENCIAS.md`: Rust, C++ toolchain, CMake and Qt. Follow those guides for
SDK paths and packaging dependencies. In a fresh checkout:

```sh
git clone https://github.com/Dohkku/grimorio.git
cd grimorio
git checkout 8da90458fe7c4a0533754bb3b1246588a3eea5b6
git apply --check /path/to/live-notes.patch
git apply /path/to/live-notes.patch
cargo test -p grimorio-puente nota_externa_confirma_y_rechaza_conflictos_y_otra_biblioteca
cargo build --release
cmake -S app -B app/build -DCMAKE_BUILD_TYPE=Release -DGRIMORIO_VERSION=0.1.21-arddhu.1
cmake --build app/build --config Release --parallel
```

On Windows, use the compiler's developer environment and configure Qt's
`CMAKE_PREFIX_PATH` as in the upstream guide. Do not blindly apply to other
revisions. Try a disposable library and retain the original application executable.

These changes were compiled and exercised locally on Windows during development.
The backend test covers save confirmation, stale-note and wrong-library rejection,
and search-index updates. Public package validation checks patch applicability;
it does not rebuild the complete application on every plugin release.

If distributing a modified application binary, provide corresponding source and
build materials under its AGPL terms and comply with dependency licenses.
This repository distributes source changes only.
