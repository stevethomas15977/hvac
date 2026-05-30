# CloudFront TLS Certificate Runbook (Cross-Account)

## Goal

Issue and validate a production TLS certificate for the HVAC frontend domain when DNS and workload ownership are split across accounts/teams.

This runbook assumes:
- CloudFront distribution is managed by Terraform in this repository.
- Certificate issuance and DNS validation require cross-account coordination.
- Certificate must exist in us-east-1 for CloudFront.

## Recommendation

Use a hybrid approach:
1. Create and validate ACM certificate manually (or by DNS owner automation) in us-east-1.
2. Store resulting certificate ARN in environment tfvars.
3. Let Terraform manage CloudFront distribution configuration using that ARN.

This avoids coupling Terraform applies to cross-account DNS approval timing.

## Ownership Split

- Platform/IaC owner (this repo):
  - CloudFront distribution
  - S3 origin and policy
  - Terraform variables and deployment workflow

- DNS or security owner (potentially another account/team):
  - Public DNS hosted zone records for ACM DNS validation
  - Domain approval and ownership controls

## Manual Certificate Process

1. In production AWS account (671018543564), request ACM certificate in us-east-1 for the production frontend domain and any SANs.
2. Use DNS validation.
3. Send ACM-provided validation CNAME records to DNS owner team.
4. DNS owner creates required CNAME records in authoritative zone.
5. Wait for ACM certificate status to become ISSUED.
6. Share certificate ARN with platform team.

## Terraform Integration

Set environment values in production tfvars:
- cloudfront_aliases as list of custom domains
- cloudfront_acm_certificate_arn as issued ACM certificate ARN

Example shape:
- cloudfront_aliases = ["app.example.com"]
- cloudfront_acm_certificate_arn = "arn:aws:acm:us-east-1:671018543564:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

When cloudfront_acm_certificate_arn is empty, Terraform keeps CloudFront default certificate.
When non-empty, Terraform uses ACM certificate with SNI and TLSv1.2_2021 minimum protocol.

## DNS Cutover to CloudFront

After Terraform apply creates/updates CloudFront:
1. Capture CloudFront domain output.
2. DNS owner creates ALIAS/ANAME/CNAME (provider-specific) from production domain to CloudFront domain.
3. Verify HTTPS and cache behavior from browser and CLI.

## Operational Checks

- Certificate region is us-east-1.
- ACM status is ISSUED before Terraform apply.
- Domain listed in cloudfront_aliases is included in certificate SANs.
- DNS records point at CloudFront distribution domain.

## Rollback

If certificate or DNS cutover fails:
1. Clear cloudfront_aliases and cloudfront_acm_certificate_arn in tfvars.
2. Re-apply Terraform to fall back to default CloudFront certificate and distribution domain.
3. Retry certificate and DNS workflow once validation is confirmed.
