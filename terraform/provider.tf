terraform {
  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "2.7.1"
    }

    aws = {
      source  = "hashicorp/aws"
      version = "6.46.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  default_tags {
    tags = {
      Project    = "HVAC Bid Submittal"
      CreatedBy  = "Terraform"
      SourceRepo = "git@github.com:stevethomas15977/hvac.git"
    }
  }
}