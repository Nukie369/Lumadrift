# Alpha v8.0 — player save portability and navigation fix

- Added local JSON export/import for device transfers, with checksum validation, explicit overwrite confirmation, maximum upload size, and existing verified checkpoint recovery.
- Export requires a verified committed save; imports are blocked while an expedition or damaged-save recovery is in progress.
- Fixed five-item mobile bottom navigation from a four-column layout to five even columns.
- No ads, purchases, cash rewards, or hosted authentication are activated.
- All 58 Node regression scripts passed in this environment. Browser UI validation and Android/device QA are still outstanding.
