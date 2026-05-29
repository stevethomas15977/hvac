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