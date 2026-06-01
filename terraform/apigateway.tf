resource "aws_apigatewayv2_api" "proposal_submission" {
  name          = "hvac-proposal-submission-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers  = ["authorization", "content-type", "x-tenant-id"]
    allow_methods  = ["GET", "OPTIONS", "POST"]
    allow_origins  = local.proposal_api_allowed_origins
    expose_headers = ["content-type"]
    max_age        = 300
  }
}

resource "aws_cloudwatch_log_group" "proposal_submission_api_access" {
  name              = "/aws/apigateway/hvac-proposal-submission-access"
  retention_in_days = 14
}

resource "aws_apigatewayv2_stage" "proposal_submission" {
  api_id      = aws_apigatewayv2_api.proposal_submission.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  route_settings {
    route_key              = "GET /api/admin/tenant/workspace"
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }

  route_settings {
    route_key              = "POST /api/admin/tenant/users/admin-role"
    throttling_burst_limit = 10
    throttling_rate_limit  = 5
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.proposal_submission_api_access.arn
    format = jsonencode({
      requestId            = "$context.requestId"
      requestTime          = "$context.requestTime"
      httpMethod           = "$context.httpMethod"
      path                 = "$context.path"
      routeKey             = "$context.routeKey"
      status               = "$context.status"
      responseLength       = "$context.responseLength"
      ip                   = "$context.identity.sourceIp"
      userAgent            = "$context.identity.userAgent"
      authorizerError      = "$context.authorizer.error"
      integrationError     = "$context.integrationErrorMessage"
      integrationStatus    = "$context.integration.status"
      integrationLatencyMs = "$context.integration.latency"
    })
  }
}

resource "aws_apigatewayv2_authorizer" "proposal_submission_cognito" {
  api_id           = aws_apigatewayv2_api.proposal_submission.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "proposal-submission-cognito-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.user_pool_client.id]
    issuer   = "https://cognito-idp.${data.aws_region.current.region}.amazonaws.com/${aws_cognito_user_pool.user_pool.id}"
  }
}

resource "aws_apigatewayv2_integration" "proposal_submission" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.proposal_submission.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "tenant_admin" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.tenant_admin.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "proposal_workflow" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.proposal_workflow.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proposal_submission" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/wizard/submissions"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.proposal_submission.id}"
}

resource "aws_lambda_permission" "proposal_submission_from_apigateway" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proposal_submission.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proposal_submission.execution_arn}/*/*"
}

resource "aws_lambda_permission" "tenant_admin_from_apigateway" {
  statement_id  = "AllowTenantAdminExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tenant_admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proposal_submission.execution_arn}/*/*"
}

resource "aws_lambda_permission" "proposal_workflow_from_apigateway" {
  statement_id  = "AllowProposalWorkflowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proposal_workflow.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proposal_submission.execution_arn}/*/*"
}

resource "aws_apigatewayv2_route" "proposal_submissions_recent_get" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "GET /api/proposals/wizard/submissions/recent"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_submission.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "proposal_workflow_triage_run" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/workflow/opportunities/{opportunityId}/triage/run"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_workflow.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "proposal_workflow_triage_decision" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/workflow/opportunities/{opportunityId}/triage/decision"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_workflow.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "proposal_workflow_qualification_run" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/run"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_workflow.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "proposal_workflow_qualification_decision" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/decision"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_workflow.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "proposal_workflow_selection_compare" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/workflow/opportunities/{opportunityId}/selection/compare"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_workflow.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_apigatewayv2_route" "proposal_workflow_selection_decision" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/proposals/workflow/opportunities/{opportunityId}/selection/decision"
  target             = "integrations/${aws_apigatewayv2_integration.proposal_workflow.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
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
