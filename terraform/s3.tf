variable "deployment_environment" {
  description = "Environment name used to derive environment-specific infrastructure names."
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "production"], var.deployment_environment)
    error_message = "deployment_environment must be either development or production."
  }
}

variable "frontend_bucket_name" {
  description = "Optional override for the Angular frontend static site bucket name."
  type        = string
  default     = ""
}

variable "frontend_bucket_force_destroy" {
  description = "Whether Terraform may delete the frontend bucket even when it contains objects."
  type        = bool
  default     = false
}

variable "frontend_bucket_versioning_enabled" {
  description = "Whether frontend bucket versioning is enabled."
  type        = bool
  default     = false
}

variable "prod_s3_bucket_frontend" {
  description = "Production S3 bucket name for hosting the Angular frontend."
  type        = string
  default     = "hvac-proposal-submittal-production"
}

variable "dev_s3_bucket_frontend" {
  description = "Development S3 bucket name for hosting the Angular frontend."
  type        = string
  default     = "hvac-proposal-submittal-development"
}

locals {
  default_frontend_bucket_names = {
    development = var.dev_s3_bucket_frontend
    production  = var.prod_s3_bucket_frontend
  }
  frontend_bucket_name = var.frontend_bucket_name != "" ? var.frontend_bucket_name : local.default_frontend_bucket_names[var.deployment_environment]
}

resource "aws_s3_bucket" "frontend" {
  bucket        = local.frontend_bucket_name
  force_destroy = var.frontend_bucket_force_destroy
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    bucket_key_enabled = true

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = var.frontend_bucket_versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

data "aws_iam_policy_document" "frontend_public_read" {
  statement {
    sid    = "PublicReadGetObject"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:GetObject"]

    resources = [
      "${aws_s3_bucket.frontend.arn}/*"
    ]
  }
}

resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_public_read.json

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}