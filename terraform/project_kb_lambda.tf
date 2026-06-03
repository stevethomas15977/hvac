data "archive_file" "project_kb_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/project_kb"
  output_path = "${path.module}/build/project_kb.zip"
}

resource "aws_cloudwatch_log_group" "project_kb_lambda" {
  name              = "/aws/lambda/hvac-project-kb"
  retention_in_days = 14
}

resource "aws_lambda_function" "project_kb" {
  function_name = "hvac-project-kb"
  role          = aws_iam_role.project_kb_lambda.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  timeout       = 15

  filename         = data.archive_file.project_kb_lambda.output_path
  source_code_hash = data.archive_file.project_kb_lambda.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.project_kb_lambda]
}
