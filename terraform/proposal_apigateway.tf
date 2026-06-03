resource "aws_apigatewayv2_integration" "proposal_submission" {
  api_id                 = aws_apigatewayv2_api.proposal_submission.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.proposal_submission.invoke_arn
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

resource "aws_lambda_permission" "proposal_submission_from_apigateway" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proposal_submission.function_name
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
