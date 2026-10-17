name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: conda-incubator/setup-miniconda@v3
        with:
          python-version: "3.12"
          environment-file: environment.yml
          activate-environment: forecast
      - name: Accept channel terms
        shell: bash -el {0}
        run: conda tos accept
      - name: Tests
        shell: bash -el {0}
        run: pytest -q

  docker-smoke:
    runs-on: ubuntu-latest
    container: continuumio/miniconda3:latest
    env:
      CONDA_PLUGINS_AUTO_ACCEPT_TOS: "yes"
    steps:
      - uses: actions/checkout@v4
      - run: conda install -y -c defaults numpy pandas

  nightly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install conda
        run: |
          wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh
          bash miniconda.sh -b -p "$HOME/conda"
      - run: "$HOME/conda/bin/python -m forecast.nightly"
