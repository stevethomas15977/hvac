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
