# Firmware Release Gate

![Firmware Release Gate for sdkconfig and prj.conf](https://getreadystack.com/img/promo/sku33021_result_card.jpg)

Finds the build-config lines that ship an ESP-IDF or Zephyr device with secure boot off, a debug port open, unsigned images or plaintext OTA.

## What it finds

```
# sdkconfig - release build, ESP32-S3
# CONFIG_SECURE_BOOT is not set                    -> secure boot off, any image boots
CONFIG_SECURE_FLASH_ENCRYPTION_MODE_DEVELOPMENT=y  -> re-flashable, key still readable
CONFIG_ESP_TLS_SKIP_SERVER_CERT_VERIFY=y           -> OTA session can be terminated by anyone
CONFIG_OTA_UPDATE_URL="http://updates.example.net/fw.bin"  -> update served in the clear
CONFIG_EXAMPLE_WIFI_PASSWORD="factory-default"     -> credential ships inside the image

5 findings in 9 lines. 18 rules ship inside.
```

## What it does for free

- Audit the config file you have open, top to bottom
- List the rules that ship inside
- Re-open the last audit report

## With a licence

- **Audit every config in the workspace** — Board overlays, sdkconfig.defaults and per-target prj.conf, not just the tab you have open.
- **Export the audit report as CSV, JSON or HTML** — A CSV, JSON or HTML file you keep with the release - the evidence that the check was run on this build.
- **Machine-readable JSON for CI** — Writes a JSON findings file so a pipeline step can fail a release branch that still carries a debug or unsigned setting.

An outside firmware-only security review starts around $6,000 and a full IoT device assessment runs $10,000 to $50,000; this is the config pass you run before you pay for one.

[**Get the full version - $29**](https://buy.polar.sh/polar_cl_cmmWDH5sYqYlHlEAy4aCkF8gPdT40c3FhYupJ1VFP22) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install firmware-release-gate
```
