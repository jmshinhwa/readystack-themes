# prod/main.tf — acme platform root module
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    cloudflare = {
      version = ">= 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "*"
    }
  }

  backend "s3" {
    bucket         = "acme-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "acme-tf-locks"
  }
}

provider "aws" {
  region = "eu-west-1"
}

provider "datadog" {
  api_url = "https://api.datadoghq.eu/"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "acme-prod"
  cidr = "10.20.0.0/16"
}

resource "aws_s3_bucket" "artifacts" {
  bucket = "acme-prod-artifacts"
}
