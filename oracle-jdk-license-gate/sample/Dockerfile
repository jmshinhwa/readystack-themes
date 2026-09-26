name: release
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'oracle'
          cache: maven
      - run: ./mvnw -B -ntp package

  native:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'graalvm'
      - run: native-image -jar target/app.jar -o dist/app

  toolchain:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch the release JDK tarball
        run: |
          curl -fsSL -o jdk.tar.gz \
            https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz
          tar xzf jdk.tar.gz
      - name: Fetch the legacy agent runtime
        run: |
          curl -fsSL -b "oraclelicense=accept-securebackup-cookie" \
            -o agent.tar.gz https://mirror.internal.example/jdk-8u411-linux-x64.tar.gz

  smoke:
    runs-on: ubuntu-latest
    container:
      image: container-registry.oracle.com/java/jdk:21
    steps:
      - run: java -version

  agent:
    runs-on: ubuntu-latest
    steps:
      - name: Provision the build toolchain
        run: |
          source "$HOME/.sdkman/bin/sdkman-init.sh"
          sdk install java 21.0.8-oracle
          sdk use java 21.0.8-oracle
