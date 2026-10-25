locals {
  db_name     = "url_shortner"
  db_username = "app"
}

resource "random_password" "db" {
  length = 32
  # RDS forbids '/', '@', '"' and spaces.
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "this" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "this" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = local.db_name
  username = local.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  backup_retention_period    = var.db_backup_retention_days
  copy_tags_to_snapshot      = true
  auto_minor_version_upgrade = true
  deletion_protection        = var.db_deletion_protection
  skip_final_snapshot        = !var.db_deletion_protection
  final_snapshot_identifier  = "${local.name}-final"
}

# ---------- RDS Proxy ----------

resource "aws_secretsmanager_secret" "db" {
  name                    = "${local.name}/db"
  recovery_window_in_days = var.secret_recovery_window_days
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = local.db_username
    password = random_password.db.result
  })
}

data "aws_iam_policy_document" "rds_proxy_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "rds_proxy" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db.arn]
  }
  statement {
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["secretsmanager.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "rds_proxy" {
  name                 = "${local.name}-rds-proxy"
  assume_role_policy   = data.aws_iam_policy_document.rds_proxy_assume.json
  permissions_boundary = local.boundary_arn
}

resource "aws_iam_role_policy" "rds_proxy" {
  name   = "read-db-secret"
  role   = aws_iam_role.rds_proxy.id
  policy = data.aws_iam_policy_document.rds_proxy.json
}

resource "aws_db_proxy" "this" {
  name                   = local.name
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  require_tls            = true
  idle_client_timeout    = 1800

  auth {
    auth_scheme               = "SECRETS"
    iam_auth                  = "DISABLED"
    client_password_auth_type = "POSTGRES_SCRAM_SHA_256"
    secret_arn                = aws_secretsmanager_secret.db.arn
  }

  depends_on = [aws_iam_role_policy.rds_proxy, aws_secretsmanager_secret_version.db]
}

resource "aws_db_proxy_default_target_group" "this" {
  db_proxy_name = aws_db_proxy.this.name
  connection_pool_config {
    max_connections_percent      = 90
    max_idle_connections_percent = 50
    connection_borrow_timeout    = 120
  }
}

resource "aws_db_proxy_target" "this" {
  db_proxy_name          = aws_db_proxy.this.name
  target_group_name      = aws_db_proxy_default_target_group.this.name
  db_instance_identifier = aws_db_instance.this.identifier
}
