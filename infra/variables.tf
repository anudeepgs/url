variable "project" {
  type    = string
  default = "url-shortner"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

# ---------- Network ----------

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "az_count" {
  description = "RDS Proxy and the DB subnet group need at least 2 AZs."
  type        = number
  default     = 2
  validation {
    condition     = var.az_count >= 2
    error_message = "az_count must be >= 2."
  }
}

# ---------- Postgres ----------

variable "db_engine_version" {
  type    = string
  default = "16"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_max_allocated_storage" {
  type    = number
  default = 100
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_backup_retention_days" {
  type    = number
  default = 7
}

variable "db_deletion_protection" {
  type    = bool
  default = false
}

# ---------- Redis ----------

variable "redis_engine_version" {
  type    = string
  default = "7.1"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "redis_num_cache_clusters" {
  description = "1 = primary only; >1 adds replicas and enables automatic failover."
  type        = number
  default     = 1
}

# ---------- Lambda / API ----------

variable "artifacts_bucket" {
  description = "S3 bucket holding Lambda zips (bootstrap output)."
  type        = string
}

variable "artifact_key" {
  description = "S3 key of the Lambda zip to deploy, e.g. url-shortner/lambda/<git-sha>.zip."
  type        = string
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "lambda_memory_mb" {
  type    = number
  default = 512
}

variable "lambda_timeout_seconds" {
  type    = number
  default = 10
}

variable "lambda_reserved_concurrency" {
  description = "-1 = unreserved. Caps concurrent executions (and therefore DB connections)."
  type        = number
  default     = -1
}

variable "log_level" {
  type    = string
  default = "info"
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "short_code_length" {
  type    = number
  default = 7
}

variable "pg_pool_max" {
  type    = number
  default = 2
}

variable "cache_ttl_seconds" {
  type    = number
  default = 86400
}

variable "api_throttle_rate_limit" {
  type    = number
  default = 100
}

variable "api_throttle_burst_limit" {
  type    = number
  default = 200
}

variable "secret_recovery_window_days" {
  type    = number
  default = 7
}
