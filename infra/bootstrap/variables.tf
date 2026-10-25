variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "url-shortner"
}

variable "github_repo" {
  description = "GitHub repository allowed to deploy, as \"owner/repo\"."
  type        = string
}

variable "github_environments" {
  description = "GitHub Environments whose jobs may assume the deploy role."
  type        = list(string)
  default     = ["dev", "prod"]
}

variable "create_github_oidc_provider" {
  description = "Set false if the account already has the token.actions.githubusercontent.com OIDC provider."
  type        = bool
  default     = true
}

variable "artifact_retention_days" {
  type    = number
  default = 90
}
