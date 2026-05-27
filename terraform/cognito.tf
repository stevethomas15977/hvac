data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

variable "cognito_additional_callback_urls" {
  description = "Additional callback URLs for deployed frontend environments."
  type        = list(string)
  default     = []
}

variable "cognito_additional_logout_urls" {
  description = "Additional logout URLs for deployed frontend environments."
  type        = list(string)
  default     = []
}

locals {
  cognito_domain_prefix = "hvac-${data.aws_caller_identity.current.account_id}"
  cognito_local_callback_urls = [
    "http://localhost:4200/callback",
    "http://localhost:8080/callback"
  ]
  cognito_local_logout_urls = [
    "http://localhost:4200/logout",
    "http://localhost:8080/logout"
  ]
  cognito_callback_urls = distinct(concat(local.cognito_local_callback_urls, var.cognito_additional_callback_urls))
  cognito_logout_urls   = distinct(concat(local.cognito_local_logout_urls, var.cognito_additional_logout_urls))
}

# Define a Cognito User Pool
resource "aws_cognito_user_pool" "user_pool" {
  name = "hvac-user-pool"

  # Configure the user pool
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Allow users to sign up themselves
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  auto_verified_attributes = ["email"]

  # Add custom attribute for tenant_id
  # schema {
  #   name = "tenant_id"
  #   attribute_data_type = "String"
  #   mutable = true
  #   required = false
  # }
}

# Define a Cognito User Pool Client
resource "aws_cognito_user_pool_client" "user_pool_client" {
  name            = "hvac-user-pool-client"
  user_pool_id    = aws_cognito_user_pool.user_pool.id
  generate_secret = false

  # OAuth settings
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = local.cognito_callback_urls
  logout_urls                          = local.cognito_logout_urls
  supported_identity_providers = ["COGNITO"]

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]
}

resource "aws_cognito_user_pool_domain" "user_pool_domain" {
  domain       = local.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.user_pool.id
}