data "aws_iam_policy_document" "proposal_submission_lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "tenant_admin_lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "proposal_workflow_lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "proposal_submission_lambda" {
  name               = "hvac-proposal-submission-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.proposal_submission_lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "proposal_submission_lambda_basic" {
  role       = aws_iam_role.proposal_submission_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "proposal_submission_lambda_dynamodb" {
  name = "hvac-proposal-submission-dynamodb-access"
  role = aws_iam_role.proposal_submission_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.proposal_submissions.arn,
          "${aws_dynamodb_table.proposal_submissions.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "tenant_admin_lambda" {
  name               = "hvac-tenant-admin-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.tenant_admin_lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "tenant_admin_lambda_basic" {
  role       = aws_iam_role.tenant_admin_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "tenant_admin_lambda_cognito_admin" {
  name = "hvac-tenant-admin-cognito-admin"
  role = aws_iam_role.tenant_admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:ListUsersInGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminUpdateUserAttributes"
        ]
        Resource = aws_cognito_user_pool.user_pool.arn
      }
    ]
  })
}

resource "aws_iam_role" "proposal_workflow_lambda" {
  name               = "hvac-proposal-workflow-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.proposal_workflow_lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "proposal_workflow_lambda_basic" {
  role       = aws_iam_role.proposal_workflow_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "proposal_workflow_lambda_dynamodb" {
  name = "hvac-proposal-workflow-dynamodb-access"
  role = aws_iam_role.proposal_workflow_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.proposal_submissions.arn,
          "${aws_dynamodb_table.proposal_submissions.arn}/index/*"
        ]
      }
    ]
  })
}
