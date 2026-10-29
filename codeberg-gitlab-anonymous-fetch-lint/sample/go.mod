name: build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Shared CI scripts
        run: git clone --depth 1 https://gitlab.com/acme-tools/ci-scripts.git
      - name: Python deps
        run: pip install "git+https://gitlab.com/acme-tools/pyhelpers.git@v2.3.0"
      - name: Go deps
        env:
          GOPROXY: direct
        run: go mod download
      - name: Latest CLI tag
        run: curl -s https://gitlab.com/api/v4/projects/acme-tools%2Fcli/releases | jq -r '.[0].tag_name'
      - name: Install CLI
        run: curl -sL -o cli.tar.gz https://gitlab.com/acme-tools/cli/-/archive/v1.4.2/cli-v1.4.2.tar.gz
      - name: UI kit
        run: npm install gitlab:acme-tools/ui-kit#v3.1.0
      - name: Billing client
        run: pip install acme-billing --index-url https://gitlab.com/api/v4/projects/41/packages/pypi/simple
