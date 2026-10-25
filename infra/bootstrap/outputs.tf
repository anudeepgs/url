output "tfstate_bucket" {
  value = aws_s3_bucket.this["tfstate"].bucket
}

output "artifacts_bucket" {
  value = aws_s3_bucket.this["artifacts"].bucket
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "workload_boundary_arn" {
  value = aws_iam_policy.workload_boundary.arn
}
