# Cognito
output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.user_pool.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.user_pool.arn
}

output "user_pool_client_id" {
  description = "The client ID for the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.user_pool_client.id
}

output "user_pool_domain_prefix" {
  description = "Cognito managed Hosted UI domain prefix"
  value       = aws_cognito_user_pool_domain.user_pool_domain.domain
}

output "user_pool_domain_url" {
  description = "Cognito managed Hosted UI domain URL"
  value       = "https://${aws_cognito_user_pool_domain.user_pool_domain.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}