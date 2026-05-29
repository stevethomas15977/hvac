variable "proposal_api_allowed_origins" {
  description = "Allowed CORS origins for the proposal submission API."
  type        = list(string)
  default     = []
}

locals {
  proposal_api_local_origins = [
    "http://localhost:4200",
    "http://localhost:8080"
  ]
  proposal_api_allowed_origins = distinct(concat(local.proposal_api_local_origins, var.proposal_api_allowed_origins))
}

resource "aws_dynamodb_table" "proposal_submissions" {
  name         = "hvac-proposal-submissions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  attribute {
    name = "gsi2pk"
    type = "S"
  }

  attribute {
    name = "gsi2sk"
    type = "S"
  }

  global_secondary_index {
    name            = "review_queue"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "submitted_by"
    hash_key        = "gsi2pk"
    range_key       = "gsi2sk"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
