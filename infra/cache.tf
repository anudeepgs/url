resource "aws_elasticache_subnet_group" "this" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = local.name
  description          = "URL shortener redirect cache"

  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_clusters
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = var.redis_num_cache_clusters > 1
  multi_az_enabled           = var.redis_num_cache_clusters > 1

  snapshot_retention_limit   = 0
  auto_minor_version_upgrade = true
  apply_immediately          = var.environment != "prod"
}
