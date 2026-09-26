# SOUP list — Meridian DR-7 portable radiography viewer

| SOUP item | Manufacturer | Version | Functional and performance requirements | Hardware and software requirements | Safety class | Published anomaly list evaluated |
| --- | --- | --- | --- | --- | --- | --- |
| zlib | Jean-loup Gailly and Mark Adler | 1.2.11 | Decompresses DICOM pixel data | Linux 6.1, glibc 2.36 | B | 2024-11-05 |
| SQLite | SQLite Consortium | ^3.45 | Stores the local study cache | Linux 6.1, 512 MB storage | B | 2026-05-18 |
| libcurl | TBD | 8.7.1 | Uploads study archives to the PACS node | Linux 6.1, OpenSSL 3.0.13 | C | 2026-04-02 |
| OpenSSL | OpenSSL Corporation | 3.0.13 | Provides TLS 1.3 for the PACS uplink | Linux 6.1 | C | No |
| Qt Base | The Qt Company | 6.5.3 | Draws the viewer window and handles touch input | Linux 6.1, Wayland 1.21 | | checked by QA |
| libjpeg-turbo | libjpeg-turbo project | latest | Decodes JPEG-compressed frames | Linux 6.1 | Low | 2026-12-01 |
| zlib | Jean-loup Gailly and Mark Adler | 1.3.1 | | - | B | 2026-07-30 |
| pugixml | Arseny Kapoulkine | 1.14 | Parses the device configuration file at boot | TODO | A | 2025-06-11 |
