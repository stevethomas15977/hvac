resource "aws_apigatewayv2_integration" "tenant_admin" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.tenant_admin.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "tenant_admin_workspace" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "GET /api/admin/tenant/workspace"
  target             = "integrations/${aws_apigatewayv2_integration.tenant_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "tenant_admin_update_role" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/admin/tenant/users/admin-role"
  target             = "integrations/${aws_apigatewayv2_integration.tenant_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_lambda_permission" "tenant_admin_from_apigateway" {
  statement_id  = "AllowTenantAdminExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tenant_admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proposal_submission.execution_arn}/*/*"
}
