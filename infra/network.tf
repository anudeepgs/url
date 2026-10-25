# Private-only VPC: no IGW/NAT. Lambda reaches RDS Proxy and Redis inside the VPC and needs no internet.

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = local.name
  }
}

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.this.id
  availability_zone = local.azs[count.index]
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  tags = {
    Name = "${local.name}-private-${local.azs[count.index]}"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags = {
    Name = "${local.name}-private"
  }
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ---------- Security groups ----------

resource "aws_security_group" "lambda" {
  name        = "${local.name}-lambda"
  description = "URL shortener Lambda functions"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "rds_proxy" {
  name        = "${local.name}-rds-proxy"
  description = "RDS Proxy"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "RDS Postgres"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "redis" {
  name        = "${local.name}-redis"
  description = "ElastiCache Redis"
  vpc_id      = aws_vpc.this.id
}

resource "aws_vpc_security_group_egress_rule" "lambda_to_proxy" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.rds_proxy.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_egress_rule" "lambda_to_redis" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.redis.id
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_lambda" {
  security_group_id            = aws_security_group.rds_proxy.id
  referenced_security_group_id = aws_security_group.lambda.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_egress_rule" "proxy_to_rds" {
  security_group_id            = aws_security_group.rds_proxy.id
  referenced_security_group_id = aws_security_group.rds.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_proxy" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.rds_proxy.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_ingress_rule" "redis_from_lambda" {
  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = aws_security_group.lambda.id
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
}
