#!/bin/sh
# provision.sh - bring a new web node and the config server under Chef
set -e
curl -L https://omnitruck.chef.io/install.sh | sudo bash -s -- -v 18
export CHEF_LICENSE=accept
sudo mkdir -p /etc/chef
sudo cp client.rb /etc/chef/client.rb
sudo chef-client --chef-license accept -o 'role[web]'
echo 'export PATH=/opt/chef/bin:$PATH' | sudo tee /etc/profile.d/chef.sh
knife bootstrap web02.example.com -U ubuntu --sudo -N web02
ssh config01.example.com 'sudo chef-server-ctl reconfigure'
