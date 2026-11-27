# Changelog

## 0.3.5

- Keep library records separate from the TextFileView data field so saving thumbnail sizes cannot break previews.
- Keep the annotation editor visible when gallery descriptions are hidden.
- Add an explicit shortcut to edit tags in the connected Grimorio application.

## 0.3.4

- Add a live 120–360 px thumbnail-size slider, saved independently in each Grimorio document.
- Resize the grid and image area without reloading images or losing scroll support.

## 0.3.3

- Keep gallery thumbnails at a stable minimum size and scroll overflowing rows in wide and narrow panes.
- Reserve scrollbar space and prevent toolbar and gallery rows from being compressed. 

## 0.3.2

- Match both README titles to the manifest name.
- Document the exact purpose of Windows username, filesystem and clipboard access.
- Replace the responsive :has selector with explicit view state.
- Replace !important overrides with scoped selector specificity, preserving the custom document icon.

## 0.3.1

- Use the Basic Latin display name Grimorio Catalog required by the community directory.

## 0.3.0

- Prepare a standalone public source tree and reproducible dependency-free build.
- Preserve per-document display preferences when reconnecting a library.
- Serialize draft saves and isolate initial settings between plugin instances.
- Validate the connected library before requesting image display.
- Include explicit access disclosures, Codex authorship and companion patch terms.
- Preserve the approved custom icon and gallery/editor layout from 0.2.3.
