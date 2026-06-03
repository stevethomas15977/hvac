import json
import logging

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

s3vectors = boto3.resource("s3vectors")

ALREADY_EXISTS_ERROR_CODES = {
    "AlreadyExists",
    "BucketAlreadyExists",
    "ConflictException",
    "ResourceAlreadyExistsException",
}


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _extract_payload(event):
    if not isinstance(event, dict):
        return {}

    body = event.get("body")
    if isinstance(body, dict):
        return body

    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}

    return event


def _validate_payload(payload):
    required_fields = ("bucket_name", "tenant", "project")
    return [field for field in required_fields if not payload.get(field)]


def _is_already_exists_error(error):
    error_code = error.response.get("Error", {}).get("Code", "")
    return error_code in ALREADY_EXISTS_ERROR_CODES


def lambda_handler(event, context):
    payload = _extract_payload(event)
    missing_fields = _validate_payload(payload)
    if missing_fields:
        return _response(
            400,
            {
                "errorType": "ValidationError",
                "message": f"Missing required field(s): {', '.join(missing_fields)}",
            },
        )

    vector_bucket_name = payload.get("bucket_name")
    tenant = payload.get("tenant")
    project = payload.get("project")
    request_id = getattr(context, "aws_request_id", "unknown")

    logger.info(
        "Processing requestId=%s tenant=%s project=%s",
        request_id,
        tenant,
        project,
    )

    try:
        response = s3vectors.create_vector_bucket(
            vectorBucketName=vector_bucket_name,
            tags={"tenant": tenant, "project": project},
        )
        vector_bucket_arn = response.get("vectorBucketArn")

        logger.info(
            "Vector bucket created requestId=%s tenant=%s project=%s vectorBucketArn=%s",
            request_id,
            tenant,
            project,
            vector_bucket_arn,
        )

        return _response(
            200,
            {
                "message": "Project knowledge vector bucket created successfully.",
                "vectorBucketName": vector_bucket_name,
                "vectorBucketArn": vector_bucket_arn,
                "tenant": tenant,
                "project": project,
                "idempotent": False,
            },
        )

    except ClientError as error:
        if _is_already_exists_error(error):
            logger.info(
                "Vector bucket already exists requestId=%s tenant=%s project=%s vectorBucketName=%s",
                request_id,
                tenant,
                project,
                vector_bucket_name,
            )
            return _response(
                200,
                {
                    "message": "Project knowledge vector bucket already exists.",
                    "vectorBucketName": vector_bucket_name,
                    "tenant": tenant,
                    "project": project,
                    "idempotent": True,
                },
            )

        error_info = error.response.get("Error", {})
        error_code = error_info.get("Code", "UnknownClientError")
        error_message = error_info.get("Message", "Unknown AWS client error")

        logger.error(
            "AWS client error requestId=%s tenant=%s project=%s errorCode=%s message=%s",
            request_id,
            tenant,
            project,
            error_code,
            error_message,
        )

        return _response(
            502,
            {
                "errorType": "AwsClientError",
                "errorCode": error_code,
                "message": error_message,
            },
        )

    except Exception:
        logger.exception(
            "Unhandled error requestId=%s tenant=%s project=%s",
            request_id,
            tenant,
            project,
        )
        return _response(
            500,
            {
                "errorType": "InternalServerError",
                "message": "An unexpected error occurred.",
            },
        )
