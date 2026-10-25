environment = "prod"
vpc_cidr    = "10.30.0.0/16"

db_instance_class        = "db.t4g.small"
db_multi_az              = true
db_backup_retention_days = 14
db_deletion_protection   = true

redis_node_type          = "cache.t4g.small"
redis_num_cache_clusters = 2

lambda_reserved_concurrency = 100
log_retention_days          = 30
secret_recovery_window_days = 30
