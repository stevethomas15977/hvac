resource "aws_apigatewayv2_api" "proposal_submission" {
  name          = "hvac-proposal-submission-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers  = ["authorization", "content-type", "x-tenant-id"]
    allow_methods  = ["OPTIONS", "POST"]
    allow_origins  = local.proposal_api_allowed_origins
    expose_headers = ["content-type"]
    max_age        = 300
  }
}

resource "aws_apigatewayv2_stage" "proposal_submission" {
  api_id      = aws_apigatewayv2_api.proposal_submission.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "proposal_submission" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.proposal_submission.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proposal_submission" {
  api_id    = aws_apigatewayv2_api.proposal_submission.id
  route_key = "POST /api/proposals/wizard/submissions"
  target    = "integrations/${aws_apigatewayv2_integration.proposal_submission.id}"
}

resource "aws_lambda_permission" "proposal_submission_from_apigateway" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proposal_submission.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proposal_submission.execution_arn}/*/*"
}
