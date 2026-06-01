data "aws_iam_policy_document" "proposal_submission_lambda_assume_role" {
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
resource "aws_iam_role_policy" "proposal_submission_lambda_cognito_admin" {
  name = "hvac-proposal-submission-cognito-admin"
  role = aws_iam_role.proposal_submission_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:ListUsers",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup"
        ]
        Resource = aws_cognito_user_pool.user_pool.arn
      }
    ]
  })
}
