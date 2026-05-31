data "archive_file" "proposal_submission_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/proposal_submission"
  output_path = "${path.module}/build/proposal_submission.zip"
}

resource "aws_cloudwatch_log_group" "proposal_submission_lambda" {
  name              = "/aws/lambda/hvac-proposal-submission"
  retention_in_days = 14
}

resource "aws_lambda_function" "proposal_submission" {
  function_name = "hvac-proposal-submission"
  role          = aws_iam_role.proposal_submission_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 10

  filename         = data.archive_file.proposal_submission_lambda.output_path
  source_code_hash = data.archive_file.proposal_submission_lambda.output_base64sha256

  environment {
    variables = {
      PROPOSAL_SUBMISSIONS_TABLE          = aws_dynamodb_table.proposal_submissions.name
      PROPOSAL_DEFAULT_TENANT_ID          = "development"
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
      PROPOSAL_WORKFLOW_CONTRACT_VERSION  = "v1"
      PROPOSAL_WORKFLOW_STUB_MODE         = "true"
    }
  }

  depends_on = [aws_cloudwatch_log_group.proposal_submission_lambda]
}
