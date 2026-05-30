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
  value       = "https://${aws_cognito_user_pool_domain.user_pool_domain.domain}.auth.${data.aws_region.current.region}.amazoncognito.com"
}

output "user_pool_callback_urls" {
  description = "Effective callback URLs configured on the Cognito app client"
  value       = aws_cognito_user_pool_client.user_pool_client.callback_urls
}

output "user_pool_logout_urls" {
  description = "Effective logout URLs configured on the Cognito app client"
  value       = aws_cognito_user_pool_client.user_pool_client.logout_urls
}

output "proposal_submission_api_endpoint" {
  description = "Invoke URL for the proposal submission HTTP API"
  value       = aws_apigatewayv2_api.proposal_submission.api_endpoint
}

output "proposal_submission_route" {
  description = "Full POST route for proposal wizard submissions"
  value       = "${aws_apigatewayv2_api.proposal_submission.api_endpoint}/api/proposals/wizard/submissions"
}

output "proposal_submissions_table_name" {
  description = "DynamoDB table name for proposal submissions"
  value       = aws_dynamodb_table.proposal_submissions.name
}

output "proposal_submission_lambda_name" {
  description = "Lambda function name for proposal wizard submissions"
  value       = aws_lambda_function.proposal_submission.function_name
}

output "frontend_bucket_name" {
  description = "S3 bucket name for the Angular frontend static site"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_website_endpoint" {
  description = "S3 website endpoint for the Angular frontend bucket"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "frontend_bucket_website_domain" {
  description = "S3 website domain for the Angular frontend bucket"
  value       = aws_s3_bucket_website_configuration.frontend.website_domain
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for the Angular frontend"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_cloudfront_domain_name" {
  description = "CloudFront domain name for the Angular frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_cloudfront_distribution_url" {
  description = "HTTPS URL for the Angular frontend CloudFront distribution"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}