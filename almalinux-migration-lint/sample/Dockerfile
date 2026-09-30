#!/usr/bin/env bash
# bootstrap.sh — provisions the build agent (written for CentOS 7)
set -euo pipefail

docker pull centos:7
docker run --rm quay.io/centos/centos:stream8 cat /etc/redhat-release

cat > /etc/yum.repos.d/base.repo <<'REPO'
[base]
name=CentOS-7 - Base
mirrorlist=http://mirrorlist.centos.org/?release=7&arch=x86_64&repo=os
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
REPO

yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
yum install -y centos-release-scl
yum install -y devtoolset-11-gcc yum-cron ntp \
    python-pip python-devel
systemctl enable --now yum-cron
scl enable devtoolset-11 -- make -C /opt/build
authconfig --enablesssd --update
systemctl restart network

if grep -q CentOS /etc/redhat-release; then
  echo "centos host"
fi
