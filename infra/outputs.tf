output "api_endpoint" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "api_function_name" {
  value = aws_lambda_function.this["api"].function_name
}

output "migrate_function_name" {
  value = aws_lambda_function.this["migrate"].function_name
}

output "rds_proxy_endpoint" {
  value = aws_db_proxy.this.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.this.primary_endpoint_address
}
