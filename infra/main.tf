terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  # Configured per env: terraform init -backend-config=envs/<env>.backend.hcl -backend-config="bucket=<tfstate bucket>"
  backend "s3" {}
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
  # AZs where RDS Proxy is unsupported (us-east-1, us-west-1).
  exclude_zone_ids = ["use1-az3", "usw1-az2"]
}

locals {
  name         = "${var.project}-${var.environment}"
  azs          = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  boundary_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project}-workload-boundary"
}
