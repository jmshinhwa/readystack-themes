terraform {
  required_version = "~> 1.9.0"

  cloud {
    organization = "acme-platform"
    workspaces {
      name = "network-prod"
    }
  }

  required_providers {
    aws = {
      source  = "registry.terraform.io/hashicorp/aws"
      version = "~> 5.80"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.62"
    }
  }

  provider_meta "aws" {
    module_name = "network"
  }
}

data "terraform_remote_state" "core" {
  backend = "remote"
  config = {
    organization = "acme-platform"
    workspaces = { name = "core-prod" }
  }
}

module "vpc" {
  source  = "app.terraform.io/acme-platform/vpc/aws"
  version = "3.4.1"
  cidr    = "10.20.0.0/16"
}

resource "tfe_workspace" "network" {
  name         = "network-prod"
  organization = "acme-platform"
}

resource "aws_route53_zone" "internal" {
  name = "internal.acme.example"
  tags = { vpc = module.vpc.vpc_id, core = data.terraform_remote_state.core.outputs.account_id }
}
