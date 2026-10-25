# Used for code dedup/unguessability; rotating it only changes codes for newly shortened URLs.
resource "random_password" "short_code_secret" {
  length  = 64
  special = false
}

locals {
  # Secrets land in Lambda env vars (KMS-encrypted at rest): no NAT/VPC endpoint is needed to fetch them.
  lambda_env = {
    NODE_ENV               = "production"
    LOG_LEVEL              = var.log_level
    SHORT_CODE_LENGTH      = tostring(var.short_code_length)
    SHORT_CODE_SECRET      = random_password.short_code_secret.result
    REDIS_URL              = "rediss://${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
    CACHE_TTL_SECONDS      = tostring(var.cache_ttl_seconds)
    CACHE_MISS_TTL_SECONDS = "60"
    PGHOST                 = aws_db_proxy.this.endpoint
    PGPORT                 = "5432"
    PGUSER                 = local.db_username
    PGPASSWORD             = random_password.db.result
    PGDATABASE             = local.db_name
    PG_POOL_MAX            = tostring(var.pg_pool_max)
    PG_SSL                 = "true"
    DB_RUN_MIGRATIONS      = "false"
  }

  functions = {
    api = {
      handler     = "dist/lambda.handler"
      timeout     = var.lambda_timeout_seconds
      concurrency = var.lambda_reserved_concurrency
    }
    migrate = {
      handler     = "dist/migrate.handler"
      timeout     = 300
      concurrency = 1
    }
  }
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name                 = "${local.name}-lambda"
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume.json
  permissions_boundary = local.boundary_arn
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = local.functions
  name              = "/aws/lambda/${local.name}-${each.key}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "this" {
  for_each      = local.functions
  function_name = "${local.name}-${each.key}"
  role          = aws_iam_role.lambda.arn
  runtime       = var.lambda_runtime
  architectures = ["arm64"]
  handler       = each.value.handler
  memory_size   = var.lambda_memory_mb
  timeout       = each.value.timeout

  s3_bucket = var.artifacts_bucket
  s3_key    = var.artifact_key

  reserved_concurrent_executions = each.value.concurrency

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.lambda[each.key].name
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_vpc]
}
