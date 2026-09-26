# acme-crm — customer records for the German entity, after a fast refactor.

terraform {
  backend "s3" {
    bucket = "acme-crm-tfstate"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "eu-west-2"
}

provider "aws" {
  alias  = "backup"
  region = "ap-south-1"
}

provider "aws" {
  alias  = "il"
  region = "il-central-1"
}

provider "google" {
  project = "acme-crm"
}

resource "aws_s3_bucket" "crm_exports" {
  bucket = "acme-crm-exports"
  region = "sa-east-1"
}

resource "aws_s3_bucket_replication_configuration" "crm" {
  bucket = aws_s3_bucket.crm_exports.id
  rule {
    destination {
      bucket = "arn:aws:s3:::acme-crm-dr"
      region = "us-west-2"
    }
  }
}

resource "aws_dynamodb_table" "sessions" {
  name        = "sessions"
  hash_key    = "id"
  kms_key_arn = "arn:aws:kms:eu-central-1:111122223333:key/crm"
  replica {
    region_name = "us-east-2"
  }
}

resource "aws_secretsmanager_secret" "crm_api" {
  name = "crm/api"
  replica {
    region = "ap-southeast-1"
  }
}

resource "google_storage_bucket" "analytics" {
  name     = "acme-crm-analytics"
  location = "US"
}

resource "azurerm_storage_account" "invoices" {
  name             = "acmecrminvoices"
  location         = "eastus"
  key_vault_key_id = "/subscriptions/0000/resourceGroups/crm/providers/Microsoft.KeyVault/vaults/crm/keys/main"
}

resource "aws_instance" "worker" {
  availability_zone = "us-west-1b"
  instance_type     = "t3.medium"
}

resource "aws_cloudwatch_log_subscription_filter" "ship" {
  name            = "ship"
  destination_arn = "arn:aws:firehose:ap-northeast-1:111122223333:deliverystream/logs"
}

resource "aws_cloudfront_function" "geo" {
  name    = "geo-router"
  runtime = "cloudfront-js-2.0"
}

module "dr" {
  source = "./modules/dr"
  region = var.dr_region
}
