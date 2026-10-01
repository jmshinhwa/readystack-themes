# rf-detr Migration Check — Ultralytics YOLO ties

![rf-detr Migration Check — Ultralytics YOLO ties — finds the line](https://getreadystack.com/img/promo/rf-detr-migration-check_demo.gif)

![rf-detr Migration Check — Ultralytics YOLO ties](https://getreadystack.com/img/promo/sku429240_result_card.jpg)

Finds every line that still ties a Python computer-vision project to **Ultralytics YOLO** (AGPL-3.0) and puts the **RF-DETR** (Apache-2.0) line next to it. Reads Dockerfiles, `requirements*.txt`, `pyproject.toml`, `environment.yml`, `setup.cfg`/`setup.py` and `.py` files.

Web version (same engine, no install): https://getreadystack.com/tools/rf-detr-migration-check

## Why this matters

Ultralytics' licence page: *"An Enterprise License is required if you want to use Ultralytics YOLO without open-sourcing your entire project."* Its list covers internal business tools, any commercial product or service, proprietary software, SaaS platforms and APIs that use YOLO behind the scenes, and embedded deployments in edge devices, robotics and cameras. The Enterprise License covers "the complete Ultralytics YOLO source code portfolio, including YOLO26, earlier YOLO versions".

Yardstick: Ultralytics' pricing page shows the Enterprise plan as "Custom"; its Pro plan is 9 per seat a month and still AGPL-3.0.

## Example: a 12-line Dockerfile, six findings (4 errors, 2 warnings)

| Line | Ultralytics line | RF-DETR fix | Severity |
|---|---|---|---|
| 2 | `FROM ultralytics/ultralytics:8.3.40-cpu` | `FROM python:3.12-slim` | error |
| 5 | `pip install ultralytics==8.3.40` | `pip install rfdetr` | error |
| 6 | `git clone …/ultralytics/yolov5` | `pip install rfdetr, drop the clone` | error |
| 7 | `ADD …/yolo11n.pt` | `RFDETRMedium(), Apache-2.0 weights` | warning |
| 8 | `yolo export … format=onnx` | `RFDETRMedium().export()` | warning |
| 9 | `pip install yolov5==7.0.13` | `pip install rfdetr` | error |

The fixed Dockerfile (`FROM python:3.12-slim` + `pip install rfdetr`) returns 0 findings.

## The 9 rules

| Rule | Severity | What it catches |
|---|---|---|
| ultralytics-package | error | `ultralytics` in requirements, pyproject, environment.yml or `pip install` |
| yolov5-pip-package | error | the `yolov5` pip package (repackaged Ultralytics YOLOv5) |
| ultralytics-docker-image | error | `FROM ultralytics/...` base images |
| ultralytics-repo-source | error | `git clone` / `git+https` of Ultralytics repos |
| torch-hub-ultralytics | error | `torch.hub.load("ultralytics/...")` at runtime |
| ultralytics-import | warning | `import ultralytics` / `from ultralytics import YOLO` |
| ultralytics-weights | warning | `yolov8n.pt`, `yolo11n.pt`, `yolo26n.pt` and exported variants |
| yolo-cli | warning | `yolo predict / train / export` commands |
| rfdetr-pml-model | warning | `RFDETRXLarge`, `RFDETR2XLarge`, `rfdetr_plus` (PML 1.0, not Apache-2.0) |

A file that declares the project AGPL-3.0 (`license = "AGPL-3.0-only"` in pyproject.toml, an SPDX header, or an OCI licence label) gets info findings instead of errors: the free licence allows Ultralytics YOLO when the complete source is published.

RF-DETR sizes: Nano, Small, Medium and Large are Apache-2.0; XL and 2XL detection models and the `rfdetr_plus` extension are PML 1.0 (source: github.com/roboflow/rf-detr). YOLOX is another Apache-2.0 option.

## Free and full version

Free: open any supported file and every finding appears in the Problems panel with its fix, all 9 rules, no cap. Command: **rf-detr Migration Check: Check current file**.

Full version: scan every repo in the workspace and export a dated migration plan per repo, each Ultralytics tie mapped to its RF-DETR line; a team key adds a CI gate. [Get the full version](https://getreadystack.com/api/buy/cl/polar_cl_UuXU7kAm3WAf84LgoasEawBMqJBBC8JlOhATk4CxErK)

Sources: https://www.ultralytics.com/license · https://www.ultralytics.com/pricing · https://github.com/roboflow/rf-detr
