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
  hash_key     = "tenant_key"
  range_key    = "submission_key"

  attribute {
    name = "tenant_key"
    type = "S"
  }

  attribute {
    name = "submission_key"
    type = "S"
  }

  attribute {
    name = "review_queue_key"
    type = "S"
  }

  attribute {
    name = "review_queue_sort_key"
    type = "S"
  }

  attribute {
    name = "submitted_by_key"
    type = "S"
  }

  attribute {
    name = "submitted_by_sort_key"
    type = "S"
  }

  attribute {
    name = "opportunity_key"
    type = "S"
  }

  attribute {
    name = "stage_updated_at"
    type = "S"
  }

  attribute {
    name = "triage_queue_key"
    type = "S"
  }

  attribute {
    name = "triage_priority_sort"
    type = "S"
  }

  global_secondary_index {
    name            = "review_queue"
    projection_type = "ALL"

    key_schema {
      attribute_name = "review_queue_key"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "review_queue_sort_key"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "submitted_by"
    projection_type = "ALL"

    key_schema {
      attribute_name = "submitted_by_key"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "submitted_by_sort_key"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "opportunity_stage_latest"
    projection_type = "ALL"

    key_schema {
      attribute_name = "opportunity_key"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "stage_updated_at"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "triage_priority_queue"
    projection_type = "ALL"

    key_schema {
      attribute_name = "triage_queue_key"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "triage_priority_sort"
      key_type       = "RANGE"
    }
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
