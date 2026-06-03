resource "aws_apigatewayv2_integration" "project_kb" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.project_kb.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "project_kb_create_vector_bucket" {
  api_id             = aws_apigatewayv2_api.proposal_submission.id
  route_key          = "POST /api/projects/kb/vector-buckets"
  target             = "integrations/${aws_apigatewayv2_integration.project_kb.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.proposal_submission_cognito.id
}

resource "aws_lambda_permission" "project_kb_from_apigateway" {
  statement_id  = "AllowProjectKbExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.project_kb.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proposal_submission.execution_arn}/*/*"
}
